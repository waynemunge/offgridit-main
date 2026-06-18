import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();
  if (!data?.is_admin) throw new Error("Unauthorized");
  return supabaseAdmin;
}

export const adminUpdateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      orderId: z.string().uuid(),
      status: z.enum(["pending", "paid", "processing", "shipped", "delivered", "cancelled"]),
    }),
  )
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.userId);
    const { error } = await db.from("orders").update({ status: data.status }).eq("id", data.orderId);
    if (error) throw error;
    return { success: true };
  });

const productInputSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  slug: z.string().min(1),
  brand: z.string().min(1),
  category: z.string().min(1),
  description: z.string().nullable(),
  price_kes: z.number().positive(),
  compare_at_price_kes: z.number().positive().nullable(),
  images: z.array(z.string()),
  specs: z.record(z.string()),
  stock: z.number().int().min(0),
  is_featured: z.boolean(),
  is_on_sale: z.boolean(),
  sale_ends_at: z.string().nullable().optional(),
});

export const adminSaveProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(productInputSchema)
  .handler(async ({ data, context }) => {
    const db: any = await requireAdmin(context.userId);
    const { id, ...fields } = data;
    if (id) {
      const { data: product, error } = await db
        .from("products")
        .update(fields)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return product;
    }
    const { data: product, error } = await db
      .from("products")
      .insert(fields)
      .select()
      .single();
    if (error) throw error;
    return product;
  });

export const adminBulkUpdateStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.array(z.object({ id: z.string().uuid(), stock: z.number().int().min(0) })))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.userId);
    await Promise.all(
      data.map((item) =>
        db.from("products").update({ stock: item.stock }).eq("id", item.id),
      ),
    );
    // Notify back-in-stock subscribers for products that now have stock
    const restocked = data.filter((item) => item.stock > 0).map((item) => item.id);
    if (restocked.length) {
      const { sendRestockNotifications } = await import("./notifications.functions");
      await sendRestockNotifications({ data: restocked }).catch(() => {});
    }
    return { updated: data.length };
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.userId);
    const { error } = await db.from("products").delete().eq("id", data.id);
    if (error) throw error;
    return { success: true };
  });

export const adminUpdateOrderNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ orderId: z.string().uuid(), notes: z.string() }))
  .handler(async ({ data, context }) => {
    const db: any = await requireAdmin(context.userId);
    const { error } = await db
      .from("orders")
      .update({ admin_notes: data.notes || null })
      .eq("id", data.orderId);
    if (error) throw error;
    return { ok: true };
  });

export const adminGetCustomers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await requireAdmin(context.userId);

    const { data: orders, error } = await db
      .from("orders")
      .select("id, full_name, email, phone, user_id, total_kes, status, created_at")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (!orders?.length) return [];

    // Group by email (covers both guest and signed-in orders)
    const map: Record<string, {
      email: string;
      full_name: string;
      phone: string;
      user_id: string | null;
      order_count: number;
      total_spend: number;
      first_order_at: string;
      last_order_at: string;
    }> = {};

    for (const o of orders) {
      const key = o.email.toLowerCase();
      if (!map[key]) {
        map[key] = {
          email: o.email,
          full_name: o.full_name,
          phone: o.phone,
          user_id: o.user_id,
          order_count: 0,
          total_spend: 0,
          first_order_at: o.created_at,
          last_order_at: o.created_at,
        };
      }
      map[key].order_count += 1;
      if (o.status !== "cancelled") {
        map[key].total_spend += Number(o.total_kes);
      }
      if (new Date(o.created_at) > new Date(map[key].last_order_at)) {
        map[key].last_order_at = o.created_at;
      }
      if (new Date(o.created_at) < new Date(map[key].first_order_at)) {
        map[key].first_order_at = o.created_at;
      }
    }

    return Object.values(map).sort((a, b) => b.total_spend - a.total_spend);
  });
