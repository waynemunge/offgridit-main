-- OffGridIt: secure checkout + missing schema
--
-- Run once in Supabase → SQL Editor. Safe to re-run (every step is idempotent).
--
-- What this does:
--   1. Adds the columns/tables the app already uses but the database is missing
--      (checkout was failing on every order because of this).
--   2. Stops signed-in users from making themselves admin.
--   3. Moves order creation to a single server-side function that prices items
--      from the database, applies discount codes, and reduces stock atomically.
--      Browsers can no longer insert orders directly (no more tampered prices).
--   4. Locks discount codes, reviews and restock subscriptions to server access.

-- ───────────────────────────────────────────────────────────── 1. Missing schema

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_kes NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- Pickup/delivery is arranged by call or WhatsApp after the order:
-- no address is collected and no delivery fee is charged online.
ALTER TABLE public.orders ALTER COLUMN address DROP NOT NULL;
ALTER TABLE public.orders ALTER COLUMN city DROP NOT NULL;
ALTER TABLE public.orders ALTER COLUMN delivery_fee_kes SET DEFAULT 0;

ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS variant TEXT;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS variants JSONB NOT NULL DEFAULT '[]';
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sale_ends_at TIMESTAMPTZ;

-- ───────────────────────────────────────────────────────────── 2. Discount codes

CREATE TABLE IF NOT EXISTS public.discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
  value NUMERIC NOT NULL CHECK (value > 0),
  min_order_kes NUMERIC NOT NULL DEFAULT 0,
  max_uses INTEGER,
  uses INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Server-only: no public policies, so only the service role can read/write.
ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.discount_codes FROM anon, authenticated;
GRANT ALL ON public.discount_codes TO service_role;

-- ───────────────────────────────────────────────────────────── 3. Reviews

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewer_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, product_id)
);
CREATE INDEX IF NOT EXISTS reviews_product_id_idx ON public.reviews(product_id);

-- Anyone can read reviews; writes go through the server (which checks sign-in).
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.reviews FROM anon, authenticated;
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT ALL ON public.reviews TO service_role;
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;
CREATE POLICY "Reviews are viewable by everyone" ON public.reviews FOR SELECT USING (true);

-- ───────────────────────────────────────────────────────────── 4. Restock subscriptions

CREATE TABLE IF NOT EXISTS public.restock_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (product_id, email)
);

-- Subscriber emails are private. The old "USING (true)" policy applied to every
-- role, letting anyone read or delete them. Subscribing goes through the server.
ALTER TABLE public.restock_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anyone_can_subscribe" ON public.restock_notifications;
DROP POLICY IF EXISTS "service_role_restock" ON public.restock_notifications;
REVOKE ALL ON public.restock_notifications FROM anon, authenticated;
GRANT ALL ON public.restock_notifications TO service_role;

-- ───────────────────────────────────────────────────────────── 5. No self-promotion to admin

-- "Users can update their own profile" had no column limit, so any user could
-- set is_admin = true on their own row. Only name/avatar are user-editable now;
-- is_admin can only be changed from the Supabase dashboard (or service role).
REVOKE INSERT, UPDATE ON public.profiles FROM anon, authenticated;
GRANT INSERT (id, full_name, avatar_url) ON public.profiles TO authenticated;
GRANT UPDATE (full_name, avatar_url) ON public.profiles TO authenticated;

-- ───────────────────────────────────────────────────────────── 6. Orders: server-only writes

DROP POLICY IF EXISTS "Users can insert their own orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert order items" ON public.order_items;
REVOKE INSERT, UPDATE, DELETE ON public.orders FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.order_items FROM anon, authenticated;
-- (Customers still read their own orders and admins read all, via existing SELECT policies.)

-- ───────────────────────────────────────────────────────────── 7. place_order()

-- Creates an order in one transaction:
--   • prices every line from the products table (client prices are ignored)
--   • locks product rows and refuses the order if any item lacks stock
--   • validates and redeems the discount code (usage counted atomically)
--   • inserts the order + items and reduces stock
-- Errors are raised with a machine-readable prefix the server maps to messages:
--   EMPTY_CART, INVALID_QUANTITY, PRODUCT_NOT_FOUND, OUT_OF_STOCK: <name>,
--   DISCOUNT_INVALID, DISCOUNT_EXPIRED, DISCOUNT_USED_UP, DISCOUNT_MIN_ORDER: <amount>
CREATE OR REPLACE FUNCTION public.place_order(
  p_user_id UUID,
  p_payment_method TEXT,
  p_full_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_notes TEXT,
  p_items JSONB,          -- [{ "product_id": "<uuid>", "quantity": 1, "variant": "256GB / Black" }]
  p_discount_code TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_product public.products%ROWTYPE;
  v_code public.discount_codes%ROWTYPE;
  v_has_code BOOLEAN := false;
  v_subtotal NUMERIC(12,2) := 0;
  v_discount NUMERIC(12,2) := 0;
  v_lines JSONB := '[]'::jsonb;
  v_order_id UUID;
  v_sold_out JSONB;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'EMPTY_CART';
  END IF;

  -- Merge duplicate lines, then lock products in id order (avoids deadlocks).
  FOR v_item IN
    SELECT (e->>'product_id')::uuid AS product_id,
           SUM((e->>'quantity')::int) AS quantity,
           MAX(NULLIF(trim(e->>'variant'), '')) AS variant
    FROM jsonb_array_elements(p_items) AS e
    GROUP BY 1
    ORDER BY 1
  LOOP
    IF v_item.quantity IS NULL OR v_item.quantity < 1 THEN
      RAISE EXCEPTION 'INVALID_QUANTITY';
    END IF;

    SELECT * INTO v_product FROM public.products WHERE id = v_item.product_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'PRODUCT_NOT_FOUND';
    END IF;
    IF v_product.stock < v_item.quantity THEN
      RAISE EXCEPTION 'OUT_OF_STOCK: %', v_product.name;
    END IF;

    v_subtotal := v_subtotal + v_product.price_kes * v_item.quantity;
    v_lines := v_lines || jsonb_build_object(
      'product_id', v_product.id,
      'name', v_product.name,
      'brand', v_product.brand,
      'image', v_product.images->>0,
      'variant', v_item.variant,
      'quantity', v_item.quantity,
      'unit_price', v_product.price_kes,
      'total_price', v_product.price_kes * v_item.quantity
    );
  END LOOP;

  IF NULLIF(trim(p_discount_code), '') IS NOT NULL THEN
    SELECT * INTO v_code FROM public.discount_codes
      WHERE code = upper(trim(p_discount_code)) AND is_active
      FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'DISCOUNT_INVALID';
    END IF;
    IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
      RAISE EXCEPTION 'DISCOUNT_EXPIRED';
    END IF;
    IF v_code.max_uses IS NOT NULL AND v_code.uses >= v_code.max_uses THEN
      RAISE EXCEPTION 'DISCOUNT_USED_UP';
    END IF;
    IF v_subtotal < v_code.min_order_kes THEN
      RAISE EXCEPTION 'DISCOUNT_MIN_ORDER: %', v_code.min_order_kes;
    END IF;

    v_has_code := true;
    v_discount := LEAST(
      v_subtotal,
      CASE WHEN v_code.type = 'percentage'
        THEN round(v_subtotal * v_code.value / 100)
        ELSE v_code.value
      END
    );
    UPDATE public.discount_codes SET uses = uses + 1 WHERE id = v_code.id;
  END IF;

  INSERT INTO public.orders (
    user_id, payment_method, full_name, email, phone, delivery_notes,
    subtotal_kes, delivery_fee_kes, discount_kes, discount_code, total_kes
  ) VALUES (
    p_user_id, p_payment_method, trim(p_full_name), trim(p_email), trim(p_phone),
    NULLIF(trim(p_notes), ''),
    v_subtotal, 0, v_discount, CASE WHEN v_has_code THEN v_code.code END, v_subtotal - v_discount
  )
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (
    order_id, product_id, product_name, product_brand, product_image, variant,
    quantity, unit_price_kes, total_price_kes
  )
  SELECT v_order_id, (l->>'product_id')::uuid, l->>'name', l->>'brand', l->>'image', l->>'variant',
         (l->>'quantity')::int, (l->>'unit_price')::numeric, (l->>'total_price')::numeric
  FROM jsonb_array_elements(v_lines) AS l;

  UPDATE public.products AS p
     SET stock = p.stock - (l->>'quantity')::int
    FROM jsonb_array_elements(v_lines) AS l
   WHERE p.id = (l->>'product_id')::uuid;

  SELECT COALESCE(jsonb_agg(p.name), '[]'::jsonb) INTO v_sold_out
    FROM public.products AS p
   WHERE p.stock = 0
     AND p.id IN (SELECT (l->>'product_id')::uuid FROM jsonb_array_elements(v_lines) AS l);

  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'subtotal', v_subtotal,
    'discount', v_discount,
    'discount_code', CASE WHEN v_has_code THEN v_code.code END,
    'total', v_subtotal - v_discount,
    'items', v_lines,
    'sold_out', v_sold_out
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.place_order(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.place_order(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT)
  TO service_role;

-- Make the API pick up the new tables/columns/function immediately.
NOTIFY pgrst, 'reload schema';
