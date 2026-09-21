import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

// Orders are created only here. The browser sends *what* it wants (product ids,
// quantities, discount code); the database function place_order() decides the
// prices, checks and reduces stock, and redeems the code in one transaction.

const placeOrderSchema = z.object({
  paymentMethod: z.enum(["mpesa", "card"]),
  fullName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{9,20}$/, "Enter a valid phone number"),
  notes: z.string().trim().max(500).optional(),
  discountCode: z.string().trim().max(30).optional(),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.number().int().min(1).max(100),
        variant: z.string().trim().max(100).optional(),
      }),
    )
    .min(1)
    .max(50),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

interface PlaceOrderRow {
  order_id: string;
  subtotal: number;
  discount: number;
  discount_code: string | null;
  total: number;
  items: {
    product_id: string;
    name: string;
    brand: string;
    image: string | null;
    variant: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
  }[];
  sold_out: string[];
}

/** Signed-in user id if the request carries a valid Supabase token, else null (guest). */
async function getOptionalUserId(): Promise<string | null> {
  const auth = getRequest()?.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice("Bearer ".length);
  if (!token) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  return error ? null : (data.user?.id ?? null);
}

/** Turn place_order()'s coded errors into messages customers can act on. */
function friendlyError(message: string): string {
  const [code, detail] = message.split(/:\s*(.*)/s);
  switch (code) {
    case "OUT_OF_STOCK":
      return `Sorry, ${detail} doesn't have enough stock left. Please update your cart.`;
    case "PRODUCT_NOT_FOUND":
      return "A product in your cart is no longer available. Please update your cart.";
    case "DISCOUNT_INVALID":
      return "That discount code isn't valid.";
    case "DISCOUNT_EXPIRED":
      return "That discount code has expired.";
    case "DISCOUNT_USED_UP":
      return "That discount code has reached its usage limit.";
    case "DISCOUNT_MIN_ORDER":
      return `That discount code needs a minimum order of KES ${Number(detail).toLocaleString("en-KE")}.`;
    case "EMPTY_CART":
    case "INVALID_QUANTITY":
      return "Your cart looks invalid. Please refresh and try again.";
    default:
      return "We couldn't place your order. Please try again or WhatsApp us.";
  }
}

export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator(placeOrderSchema)
  .handler(async ({ data }) => {
    const userId = await getOptionalUserId();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin.rpc("place_order", {
      p_user_id: userId,
      p_payment_method: data.paymentMethod,
      p_full_name: data.fullName,
      p_email: data.email,
      p_phone: data.phone,
      p_notes: data.notes ?? null,
      p_items: data.items.map((i) => ({
        product_id: i.productId,
        quantity: i.quantity,
        variant: i.variant ?? null,
      })),
      p_discount_code: data.discountCode ?? null,
    });

    if (error) {
      console.error("place_order failed:", error);
      throw new Error(friendlyError(error.message ?? ""));
    }

    // place_order() returns jsonb; its shape is defined in the migration.
    const order = row as unknown as PlaceOrderRow;
    const emailData = {
      orderId: order.order_id,
      customerName: data.fullName,
      customerEmail: data.email,
      phone: data.phone,
      paymentMethod: data.paymentMethod,
      items: order.items.map((i) => ({
        name: i.name,
        brand: i.brand,
        variant: i.variant,
        quantity: i.quantity,
        total_price: Number(i.total_price),
      })),
      subtotal: Number(order.subtotal),
      discount: Number(order.discount),
      discountCode: order.discount_code,
      total: Number(order.total),
    };

    // Emails must never fail the order — it's already saved.
    const { sendOrderConfirmationEmail, notifyAdminNewOrder } = await import("../email.server");
    await Promise.allSettled([
      sendOrderConfirmationEmail(emailData),
      notifyAdminNewOrder(emailData, order.sold_out ?? []),
    ]);

    return {
      orderId: order.order_id,
      subtotal: emailData.subtotal,
      discount: emailData.discount,
      total: emailData.total,
    };
  });
