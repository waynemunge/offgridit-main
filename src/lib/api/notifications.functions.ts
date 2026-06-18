import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const subscribeToRestock = createServerFn({ method: "POST" })
  .inputValidator(z.object({ productId: z.string().uuid(), email: z.string().email() }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db: any = supabaseAdmin;
    const { error } = await db
      .from("restock_notifications")
      .upsert(
        { product_id: data.productId, email: data.email, notified_at: null },
        { onConflict: "product_id,email" },
      );
    if (error) throw error;
    return { ok: true };
  });

export const sendRestockNotifications = createServerFn({ method: "POST" })
  .inputValidator(z.array(z.string().uuid()))
  .handler(async ({ data: productIds }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || !productIds.length) return { sent: 0 };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db: any = supabaseAdmin;

    const { data: notifs } = await db
      .from("restock_notifications")
      .select("id, email, products(name, slug)")
      .in("product_id", productIds)
      .is("notified_at", null);

    if (!notifs?.length) return { sent: 0 };

    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const from = process.env.RESEND_FROM_EMAIL ?? "OffGridIt <onboarding@resend.dev>";

    let sent = 0;
    for (const n of notifs) {
      const productName = n.products?.name ?? "Your product";
      const productSlug = n.products?.slug ?? "";
      const { error } = await resend.emails.send({
        from,
        to: n.email,
        subject: `Back in stock: ${productName} — OffGridIt`,
        html: `<p style="font-family:sans-serif;color:#e5e5e5;background:#111;padding:32px;border-radius:12px;">
          Good news! <strong>${productName}</strong> is back in stock at OffGridIt.<br/><br/>
          <a href="https://offgridit.co.ke/product/${productSlug}" style="background:#7c3aed;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Shop now →</a>
        </p>`,
      });
      if (!error) {
        await db
          .from("restock_notifications")
          .update({ notified_at: new Date().toISOString() })
          .eq("id", n.id);
        sent++;
      }
    }
    return { sent };
  });

export const notifyAdminLowStock = createServerFn({ method: "POST" })
  .inputValidator(z.array(z.string().uuid()))
  .handler(async ({ data: productIds }) => {
    const apiKey = process.env.RESEND_API_KEY;
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!apiKey || !adminEmail) return { sent: false };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: products } = await supabaseAdmin
      .from("products")
      .select("name, stock")
      .in("id", productIds)
      .eq("stock", 0);

    if (!products?.length) return { sent: false };

    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const list = products.map((p) => `<li>${p.name}</li>`).join("");

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL ?? "OffGridIt <onboarding@resend.dev>",
      to: adminEmail,
      subject: `⚠️ ${products.length} product${products.length > 1 ? "s" : ""} just went out of stock`,
      html: `<h2 style="font-family:sans-serif">Out of stock alert</h2><ul style="font-family:sans-serif">${list}</ul><p style="font-family:sans-serif">Log in to your <a href="https://offgridit.co.ke/admin">admin panel</a> to restock.</p>`,
    });
    return { sent: true };
  });

const orderItemSchema = z.object({
  name: z.string(),
  brand: z.string(),
  quantity: z.number(),
  unit_price_kes: z.number(),
  total_price_kes: z.number(),
});

const sendOrderConfirmationSchema = z.object({
  orderId: z.string(),
  customerName: z.string(),
  customerEmail: z.string().email(),
  paymentMethod: z.enum(["mpesa", "card"]),
  phone: z.string(),
  address: z.string(),
  city: z.string(),
  items: z.array(orderItemSchema),
  subtotal: z.number(),
  shipping: z.number(),
  total: z.number(),
});

function formatKES(amount: number) {
  return `KES ${amount.toLocaleString("en-KE")}`;
}

function buildEmailHtml(data: z.infer<typeof sendOrderConfirmationSchema>) {
  const itemRows = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #2a2a2a;font-size:14px;">
          <strong>${item.name}</strong><br/>
          <span style="color:#888;font-size:12px;">${item.brand}</span>
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #2a2a2a;text-align:center;font-size:14px;">${item.quantity}</td>
        <td style="padding:8px 0;border-bottom:1px solid #2a2a2a;text-align:right;font-size:14px;">${formatKES(item.total_price_kes)}</td>
      </tr>`
    )
    .join("");

  const mpesaNote =
    data.paymentMethod === "mpesa"
      ? `<div style="margin:24px 0;padding:16px;background:#0f2a1a;border:1px solid #1a4a2a;border-radius:10px;">
          <p style="margin:0 0 6px;font-size:13px;color:#4ade80;font-weight:600;">M-PESA PAYMENT PENDING</p>
          <p style="margin:0;font-size:13px;color:#86efac;">
            Please send <strong>${formatKES(data.total)}</strong> to our M-Pesa till/paybill.
            Use your order ID <strong>#${data.orderId.slice(0, 8).toUpperCase()}</strong> as the reference.
            Your order will be processed once payment is confirmed.
          </p>
        </div>`
      : "";

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e5e5e5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#111;border:1px solid #222;border-radius:16px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a0a2e,#0d1a3a);padding:32px;text-align:center;">
            <p style="margin:0;font-size:22px;font-weight:700;letter-spacing:-0.5px;color:#fff;">OffGridIt</p>
            <p style="margin:6px 0 0;font-size:13px;color:#a0a0c0;">Premium Tech in Kenya</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 4px;font-size:24px;font-weight:700;color:#fff;">Order confirmed ✓</p>
            <p style="margin:0 0 24px;font-size:14px;color:#888;">
              Hi ${data.customerName}, thanks for your order!
            </p>

            <div style="background:#1a1a1a;border-radius:10px;padding:16px;margin-bottom:24px;">
              <p style="margin:0 0 4px;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:1px;">Order ID</p>
              <p style="margin:0;font-size:16px;font-weight:600;font-family:monospace;color:#a78bfa;">
                #${data.orderId.slice(0, 8).toUpperCase()}
              </p>
            </div>

            ${mpesaNote}

            <!-- Items table -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
              <tr>
                <th style="text-align:left;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:1px;padding-bottom:10px;border-bottom:1px solid #2a2a2a;">Item</th>
                <th style="text-align:center;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:1px;padding-bottom:10px;border-bottom:1px solid #2a2a2a;">Qty</th>
                <th style="text-align:right;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:1px;padding-bottom:10px;border-bottom:1px solid #2a2a2a;">Total</th>
              </tr>
              ${itemRows}
            </table>

            <!-- Totals -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="padding:4px 0;font-size:13px;color:#888;">Subtotal</td>
                <td style="padding:4px 0;font-size:13px;text-align:right;">${formatKES(data.subtotal)}</td>
              </tr>
              <tr>
                <td style="padding:4px 0;font-size:13px;color:#888;">Shipping</td>
                <td style="padding:4px 0;font-size:13px;text-align:right;">${formatKES(data.shipping)}</td>
              </tr>
              <tr>
                <td style="padding:12px 0 0;font-size:16px;font-weight:700;border-top:1px solid #2a2a2a;">Total</td>
                <td style="padding:12px 0 0;font-size:16px;font-weight:700;text-align:right;color:#a78bfa;border-top:1px solid #2a2a2a;">${formatKES(data.total)}</td>
              </tr>
            </table>

            <!-- Delivery -->
            <div style="background:#1a1a1a;border-radius:10px;padding:16px;">
              <p style="margin:0 0 8px;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:1px;">Delivery address</p>
              <p style="margin:0;font-size:14px;line-height:1.6;">
                ${data.customerName}<br/>
                ${data.phone}<br/>
                ${data.address}<br/>
                ${data.city}
              </p>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #1a1a1a;text-align:center;">
            <p style="margin:0;font-size:12px;color:#555;">
              Questions? Reply to this email or contact us.<br/>
              © ${new Date().getFullYear()} OffGridIt — Genuine tech, delivered across Kenya.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export const sendOrderConfirmation = createServerFn({ method: "POST" })
  .inputValidator(sendOrderConfirmationSchema)
  .handler(async ({ data }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.warn("RESEND_API_KEY not set — skipping order confirmation email");
      return { sent: false };
    }

    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);

    // Use onboarding@resend.dev until a custom domain is verified in Resend
    const fromAddress = process.env.RESEND_FROM_EMAIL ?? "OffGridIt <onboarding@resend.dev>";

    const { error } = await resend.emails.send({
      from: fromAddress,
      to: data.customerEmail,
      subject: `Order confirmed #${data.orderId.slice(0, 8).toUpperCase()} — OffGridIt`,
      html: buildEmailHtml(data),
    });

    if (error) {
      console.error("Failed to send order confirmation email:", error);
      return { sent: false };
    }

    return { sent: true };
  });
