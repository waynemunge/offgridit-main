import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Only the customer-facing subscription lives here. Email *sending* is in
// src/lib/email.server.ts and is called from trusted server code only —
// public server functions for it let anyone send email through our Resend account.

export const subscribeToRestock = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({ productId: z.string().uuid(), email: z.string().trim().email().max(200) }),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin;
    const { error } = await db
      .from("restock_notifications")
      .upsert(
        { product_id: data.productId, email: data.email.toLowerCase(), notified_at: null },
        { onConflict: "product_id,email" },
      );
    if (error) throw error;
    return { ok: true };
  });
