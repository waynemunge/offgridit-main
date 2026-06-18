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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return supabaseAdmin as any;
}

export const validateDiscountCode = createServerFn({ method: "POST" })
  .inputValidator(z.object({
    code: z.string().min(1),
    orderTotal: z.number().positive(),
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = supabaseAdmin;
    const { data: row, error } = await db
      .from("discount_codes")
      .select("*")
      .eq("code", data.code.toUpperCase().trim())
      .eq("is_active", true)
      .maybeSingle();

    if (error || !row) throw new Error("Invalid or expired code");
    if (row.expires_at && new Date(row.expires_at) < new Date()) throw new Error("This code has expired");
    if (row.max_uses !== null && row.uses >= row.max_uses) throw new Error("This code has reached its usage limit");
    if (data.orderTotal < Number(row.min_order_kes)) {
      throw new Error(`Minimum order of KES ${Number(row.min_order_kes).toLocaleString()} required`);
    }

    const rawDiscount =
      row.type === "percentage"
        ? Math.round((data.orderTotal * Number(row.value)) / 100)
        : Number(row.value);

    return {
      id: row.id as string,
      code: row.code as string,
      type: row.type as "percentage" | "fixed",
      value: Number(row.value),
      discount: Math.min(rawDiscount, data.orderTotal),
    };
  });

export const redeemDiscountCode = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = supabaseAdmin;
    const { data: row } = await db.from("discount_codes").select("uses").eq("id", data.id).single();
    await db.from("discount_codes").update({ uses: (row?.uses ?? 0) + 1 }).eq("id", data.id);
    return { ok: true };
  });

export const adminGetDiscountCodes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await requireAdmin(context.userId);
    const { data, error } = await db.from("discount_codes").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  });

export const adminCreateDiscountCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({
    code: z.string().min(2).max(20),
    type: z.enum(["percentage", "fixed"]),
    value: z.number().positive(),
    min_order_kes: z.number().min(0).default(0),
    max_uses: z.number().int().positive().nullable().default(null),
    expires_at: z.string().nullable().default(null),
  }))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.userId);
    const { data: row, error } = await db.from("discount_codes").insert({
      code: data.code.toUpperCase().trim(),
      type: data.type,
      value: data.value,
      min_order_kes: data.min_order_kes,
      max_uses: data.max_uses,
      expires_at: data.expires_at,
    }).select().single();
    if (error) throw error;
    return row;
  });

export const adminToggleDiscountCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid(), is_active: z.boolean() }))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.userId);
    const { error } = await db.from("discount_codes").update({ is_active: data.is_active }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminDeleteDiscountCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const db = await requireAdmin(context.userId);
    const { error } = await db.from("discount_codes").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });
