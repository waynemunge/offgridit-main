-- OffGridIt: product status — Draft / Live / Archived
--
-- Run once in Supabase → SQL Editor: on the TEST project first, then LIVE.
-- Safe to re-run.
--
--   draft    — being set up; hidden from customers (new products start here)
--   active   — Live: shown in the store and can be ordered
--   archived — no longer sold; hidden from customers, kept for records
--
-- Existing products become 'active' so the store looks the same after this runs.
-- The live database already had an unused Lovable-era `status` column; it is reused.

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS status TEXT;

-- Drop any old check constraint on status (the Lovable column may have had one).
DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
     WHERE conrelid = 'public.products'::regclass
       AND contype = 'c'
       AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.products DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

UPDATE public.products
   SET status = 'active'
 WHERE status IS NULL OR status NOT IN ('draft', 'active', 'archived');

ALTER TABLE public.products ALTER COLUMN status SET DEFAULT 'draft';
ALTER TABLE public.products ALTER COLUMN status SET NOT NULL;
ALTER TABLE public.products
  ADD CONSTRAINT products_status_check CHECK (status IN ('draft', 'active', 'archived'));

-- Customers only see live products; admins see everything (for the admin page).
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;
DROP POLICY IF EXISTS "Live products are viewable by everyone; admins see all" ON public.products;
CREATE POLICY "Live products are viewable by everyone; admins see all" ON public.products
  FOR SELECT USING (
    status = 'active'
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- place_order(): same as before, plus refusing products that aren't live.
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
    -- Draft and archived products can't be ordered, even from an old cart or link.
    IF NOT FOUND OR v_product.status <> 'active' THEN
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

NOTIFY pgrst, 'reload schema';
