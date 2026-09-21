// Server-only email helpers (Resend). The .server.ts suffix keeps this out of the
// client bundle. These used to be public server functions, which let anyone send
// arbitrary email through our Resend account — call them only from trusted
// server code (placeOrder, admin functions).
import process from "node:process";
import { SITE_URL, WHATSAPP_URL } from "./site";

function fromAddress() {
  // onboarding@resend.dev works until a custom domain is verified in Resend.
  return process.env.RESEND_FROM_EMAIL ?? "OffGridIt <onboarding@resend.dev>";
}

async function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  const { Resend } = await import("resend");
  return new Resend(apiKey);
}

/** Escape customer-supplied text before putting it in HTML. */
export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatKES(amount: number) {
  return `KES ${Number(amount).toLocaleString("en-KE")}`;
}

export function shortOrderId(orderId: string) {
  return orderId.slice(0, 8).toUpperCase();
}

// ───────────────────────────────────────────────────────── Order confirmation

export interface OrderEmailData {
  orderId: string;
  customerName: string;
  customerEmail: string;
  phone: string;
  paymentMethod: "mpesa" | "card";
  items: {
    name: string;
    brand: string;
    variant: string | null;
    quantity: number;
    total_price: number;
  }[];
  subtotal: number;
  discount: number;
  discountCode: string | null;
  total: number;
}

function buildOrderEmailHtml(d: OrderEmailData) {
  const ref = shortOrderId(d.orderId);
  const itemRows = d.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #2a2a2a;font-size:14px;">
          <strong>${esc(item.name)}</strong><br/>
          <span style="color:#888;font-size:12px;">${esc(item.brand)}${item.variant ? ` · ${esc(item.variant)}` : ""}</span>
        </td>
        <td style="padding:8px 0;border-bottom:1px solid #2a2a2a;text-align:center;font-size:14px;">${item.quantity}</td>
        <td style="padding:8px 0;border-bottom:1px solid #2a2a2a;text-align:right;font-size:14px;">${formatKES(item.total_price)}</td>
      </tr>`,
    )
    .join("");

  const discountRow =
    d.discount > 0
      ? `<tr>
          <td style="padding:4px 0;font-size:13px;color:#4ade80;">Discount${d.discountCode ? ` (${esc(d.discountCode)})` : ""}</td>
          <td style="padding:4px 0;font-size:13px;text-align:right;color:#4ade80;">-${formatKES(d.discount)}</td>
        </tr>`
      : "";

  const paymentNote =
    d.paymentMethod === "mpesa"
      ? `We'll call or WhatsApp you on <strong>${esc(d.phone)}</strong> to confirm your order and share the M-Pesa payment details. Use <strong>#${ref}</strong> as the payment reference.`
      : `We'll call or WhatsApp you on <strong>${esc(d.phone)}</strong> to confirm your order and arrange card payment.`;

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e5e5e5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#111;border:1px solid #222;border-radius:16px;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#1a0a2e,#0d1a3a);padding:32px;text-align:center;">
            <p style="margin:0;font-size:22px;font-weight:700;letter-spacing:-0.5px;color:#fff;">OffGridIt</p>
            <p style="margin:6px 0 0;font-size:13px;color:#a0a0c0;">Premium Tech in Kenya</p>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 4px;font-size:24px;font-weight:700;color:#fff;">Order received ✓</p>
            <p style="margin:0 0 24px;font-size:14px;color:#888;">Hi ${esc(d.customerName)}, thanks for your order!</p>

            <div style="background:#1a1a1a;border-radius:10px;padding:16px;margin-bottom:24px;">
              <p style="margin:0 0 4px;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:1px;">Order ID</p>
              <p style="margin:0;font-size:16px;font-weight:600;font-family:monospace;color:#a78bfa;">#${ref}</p>
            </div>

            <div style="margin:0 0 24px;padding:16px;background:#0f2a1a;border:1px solid #1a4a2a;border-radius:10px;">
              <p style="margin:0 0 6px;font-size:13px;color:#4ade80;font-weight:600;">NEXT STEP</p>
              <p style="margin:0;font-size:13px;color:#86efac;line-height:1.6;">
                ${paymentNote} Pickup or delivery is arranged on the same call.
              </p>
            </div>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
              <tr>
                <th style="text-align:left;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:1px;padding-bottom:10px;border-bottom:1px solid #2a2a2a;">Item</th>
                <th style="text-align:center;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:1px;padding-bottom:10px;border-bottom:1px solid #2a2a2a;">Qty</th>
                <th style="text-align:right;font-size:11px;color:#666;text-transform:uppercase;letter-spacing:1px;padding-bottom:10px;border-bottom:1px solid #2a2a2a;">Total</th>
              </tr>
              ${itemRows}
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr>
                <td style="padding:4px 0;font-size:13px;color:#888;">Subtotal</td>
                <td style="padding:4px 0;font-size:13px;text-align:right;">${formatKES(d.subtotal)}</td>
              </tr>
              ${discountRow}
              <tr>
                <td style="padding:12px 0 0;font-size:16px;font-weight:700;border-top:1px solid #2a2a2a;">Total</td>
                <td style="padding:12px 0 0;font-size:16px;font-weight:700;text-align:right;color:#a78bfa;border-top:1px solid #2a2a2a;">${formatKES(d.total)}</td>
              </tr>
            </table>

            <p style="margin:0;text-align:center;">
              <a href="${WHATSAPP_URL}" style="display:inline-block;background:#25d366;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Chat with us on WhatsApp</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid #1a1a1a;text-align:center;">
            <p style="margin:0;font-size:12px;color:#555;">
              Questions? Reply to this email or WhatsApp us.<br/>
              © ${new Date().getFullYear()} OffGridIt — <a href="${SITE_URL}" style="color:#777;">offgridit.store</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendOrderConfirmationEmail(d: OrderEmailData): Promise<boolean> {
  const resend = await getResend();
  if (!resend) {
    console.warn("RESEND_API_KEY not set — skipping order confirmation email");
    return false;
  }
  const { error } = await resend.emails.send({
    from: fromAddress(),
    to: d.customerEmail,
    subject: `Order received #${shortOrderId(d.orderId)} — OffGridIt`,
    html: buildOrderEmailHtml(d),
  });
  if (error) {
    console.error("Failed to send order confirmation email:", error);
    return false;
  }
  return true;
}

// ───────────────────────────────────────────────────────── Admin: new order + sold out

export async function notifyAdminNewOrder(d: OrderEmailData, soldOut: string[]): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  const resend = await getResend();
  if (!resend || !adminEmail) return;

  const items = d.items
    .map((i) => `<li>${i.quantity} × ${esc(i.name)}${i.variant ? ` (${esc(i.variant)})` : ""}</li>`)
    .join("");
  const soldOutNote = soldOut.length
    ? `<p style="font-family:sans-serif;color:#b45309"><strong>Now out of stock:</strong> ${soldOut.map(esc).join(", ")}</p>`
    : "";

  await resend.emails.send({
    from: fromAddress(),
    to: adminEmail,
    subject: `🛒 New order #${shortOrderId(d.orderId)} — ${formatKES(d.total)}`,
    html: `<div style="font-family:sans-serif">
      <h2>New order #${shortOrderId(d.orderId)}</h2>
      <p><strong>${esc(d.customerName)}</strong> · ${esc(d.phone)} · ${esc(d.customerEmail)}<br/>
      Payment: ${d.paymentMethod === "mpesa" ? "M-Pesa" : "Card"} · Total: <strong>${formatKES(d.total)}</strong></p>
      <ul>${items}</ul>
      ${soldOutNote}
      <p><a href="${SITE_URL}/admin">Open admin panel</a></p>
    </div>`,
  });
}

// ───────────────────────────────────────────────────────── Back in stock

export async function sendRestockEmails(productIds: string[]): Promise<number> {
  const resend = await getResend();
  if (!resend || !productIds.length) return 0;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db: any = supabaseAdmin;

  const { data: notifs } = await db
    .from("restock_notifications")
    .select("id, email, products(name, slug)")
    .in("product_id", productIds)
    .is("notified_at", null);
  if (!notifs?.length) return 0;

  let sent = 0;
  for (const n of notifs) {
    const productName = n.products?.name ?? "Your product";
    const productSlug = encodeURIComponent(n.products?.slug ?? "");
    const { error } = await resend.emails.send({
      from: fromAddress(),
      to: n.email,
      subject: `Back in stock: ${productName} — OffGridIt`,
      html: `<p style="font-family:sans-serif;color:#e5e5e5;background:#111;padding:32px;border-radius:12px;">
        Good news! <strong>${esc(productName)}</strong> is back in stock at OffGridIt.<br/><br/>
        <a href="${SITE_URL}/product/${productSlug}" style="background:#7c3aed;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Shop now →</a>
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
  return sent;
}
