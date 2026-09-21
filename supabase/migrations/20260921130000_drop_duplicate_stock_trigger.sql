-- OffGridIt: stop stock being taken twice per order
--
-- Run once in Supabase → SQL Editor. Safe to re-run.
--
-- The live database had a trigger (created outside these migrations, in the
-- Lovable era) that reduced products.stock whenever an order item was inserted.
-- place_order() already checks and reduces stock itself, so with both in place
-- every order took the stock twice and could push it below zero.
-- place_order() and set_order_status() are now the only things that change stock
-- for orders.

DROP TRIGGER IF EXISTS trg_decrement_stock ON public.order_items;
DROP FUNCTION IF EXISTS public.decrement_stock_on_order();
