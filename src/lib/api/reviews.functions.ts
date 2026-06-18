import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const submitReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      productId: z.string().uuid(),
      rating: z.number().int().min(1).max(5),
      comment: z.string().max(1000).optional(),
      reviewerName: z.string().min(1).max(100),
    }),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = supabaseAdmin;
    const { error } = await db.from("reviews").upsert(
      {
        product_id: data.productId,
        user_id: context.userId,
        reviewer_name: data.reviewerName,
        rating: data.rating,
        comment: data.comment ?? null,
      },
      { onConflict: "user_id,product_id" },
    );
    if (error) throw error;
    return { success: true };
  });

export const deleteReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ reviewId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db: any = supabaseAdmin;
    const { error } = await db
      .from("reviews")
      .delete()
      .eq("id", data.reviewId)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { success: true };
  });
