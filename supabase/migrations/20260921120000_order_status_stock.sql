-- OffGridIt: cancelling an order puts its items back in stock
--
-- Run once in Supabase → SQL Editor, BEFORE merging the app change that calls it.
-- Safe to re-run.
--
-- set_order_status() changes an order's status in one transaction:
--   • into "cancelled"  → each item's quantity is added back to its product's stock
--   • out of "cancelled" → the quantities are taken off stock again; refused with
--                          OUT_OF_STOCK: <name> if there isn't enough left
--   • any other change   → status only
-- Items whose product has since been deleted are skipped.

CREATE OR REPLACE FUNCTION public.set_order_status(p_order_id UUID, p_status TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old TEXT;
  v_item RECORD;
  v_stock_change TEXT := 'none';
BEGIN
  IF p_status NOT IN ('pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled') THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  SELECT status INTO v_old FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND';
  END IF;

  IF v_old <> 'cancelled' AND p_status = 'cancelled' THEN
    UPDATE public.products AS p
       SET stock = p.stock + i.qty
      FROM (
        SELECT product_id, SUM(quantity)::int AS qty
          FROM public.order_items
         WHERE order_id = p_order_id AND product_id IS NOT NULL
         GROUP BY product_id
      ) AS i
     WHERE p.id = i.product_id;
    v_stock_change := 'restocked';

  ELSIF v_old = 'cancelled' AND p_status <> 'cancelled' THEN
    -- Lock products in id order (same as place_order) and check stock first.
    FOR v_item IN
      SELECT p.id, p.name, p.stock, i.qty
        FROM (
          SELECT product_id, SUM(quantity)::int AS qty
            FROM public.order_items
           WHERE order_id = p_order_id AND product_id IS NOT NULL
           GROUP BY product_id
        ) AS i
        JOIN public.products AS p ON p.id = i.product_id
       ORDER BY p.id
         FOR UPDATE OF p
    LOOP
      IF v_item.stock < v_item.qty THEN
        RAISE EXCEPTION 'OUT_OF_STOCK: %', v_item.name;
      END IF;
      UPDATE public.products SET stock = stock - v_item.qty WHERE id = v_item.id;
    END LOOP;
    v_stock_change := 'reserved';
  END IF;

  UPDATE public.orders SET status = p_status WHERE id = p_order_id;

  RETURN jsonb_build_object('previous', v_old, 'status', p_status, 'stock', v_stock_change);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_order_status(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_order_status(UUID, TEXT) TO service_role;

NOTIFY pgrst, 'reload schema';
