import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Check, CreditCard, Loader2, Smartphone, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { validateDiscountCode, redeemDiscountCode } from "@/lib/api/discount.functions";
import { sendOrderConfirmation, notifyAdminLowStock } from "@/lib/api/notifications.functions";
import { formatKES } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — OffGridIt" }] }),
  component: Checkout,
});

const SHIPPING = 350;

type AppliedCode = { id: string; code: string; discount: number; type: "percentage" | "fixed"; value: number };

function Checkout() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { lines, subtotal, clearCart } = useCart();
  const [method, setMethod] = useState<"mpesa" | "card">("mpesa");
  const [placing, setPlacing] = useState(false);
  const [done, setDone] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [appliedCode, setAppliedCode] = useState<AppliedCode | null>(null);

  const discount = appliedCode?.discount ?? 0;
  const total = subtotal + (lines.length ? SHIPPING : 0) - discount;

  const applyCoupon = async () => {
    if (!couponInput.trim()) return;
    setApplyingCoupon(true);
    try {
      const result = await validateDiscountCode({ data: { code: couponInput, orderTotal: subtotal } });
      setAppliedCode(result);
      toast.success(`Code applied — ${result.type === "percentage" ? `${result.value}%` : formatKES(result.value)} off!`);
    } catch (err: any) {
      toast.error(err?.message ?? "Invalid code");
    } finally {
      setApplyingCoupon(false);
    }
  };

  const removeCoupon = () => { setAppliedCode(null); setCouponInput(""); };

  const placeOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!lines.length) return;
    const fd = new FormData(e.currentTarget);
    setPlacing(true);
    try {
      const { data: order, error: orderErr } = await (supabase as any)
        .from("orders")
        .insert({
          user_id: user?.id ?? null,
          payment_method: method,
          full_name: fd.get("name") as string,
          email: fd.get("email") as string,
          phone: fd.get("phone") as string,
          address: fd.get("address") as string,
          city: fd.get("city") as string,
          delivery_notes: (fd.get("notes") as string) || null,
          subtotal_kes: subtotal,
          delivery_fee_kes: SHIPPING,
          discount_kes: discount,
          discount_code: appliedCode?.code ?? null,
          total_kes: total,
        })
        .select("id")
        .single();
      if (orderErr) throw orderErr;

      const { error: itemsErr } = await supabase.from("order_items").insert(
        lines.map((l) => ({
          order_id: order.id,
          product_id: l.product.id,
          product_name: l.product.name,
          product_brand: l.product.brand,
          product_image: l.product.images[0] ?? null,
          quantity: l.quantity,
          unit_price_kes: l.product.price_kes,
          total_price_kes: l.product.price_kes * l.quantity,
        })),
      );
      if (itemsErr) throw itemsErr;

      setDone(true);
      clearCart();
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Order placed successfully!");

      // Redeem discount code usage
      if (appliedCode) {
        redeemDiscountCode({ data: { id: appliedCode.id } }).catch(() => {});
      }

      // Notify admin of any products that just hit 0 stock
      const orderedProductIds = lines.map((l) => l.product.id);
      notifyAdminLowStock({ data: orderedProductIds }).catch(() => {});

      // Fire-and-forget confirmation email
      sendOrderConfirmation({
        data: {
          orderId: order.id,
          customerName: fd.get("name") as string,
          customerEmail: fd.get("email") as string,
          paymentMethod: method,
          phone: fd.get("phone") as string,
          address: fd.get("address") as string,
          city: fd.get("city") as string,
          items: lines.map((l) => ({
            name: l.product.name,
            brand: l.product.brand,
            quantity: l.quantity,
            unit_price_kes: l.product.price_kes,
            total_price_kes: l.product.price_kes * l.quantity,
          })),
          subtotal,
          shipping: SHIPPING,
          total,
        },
      }).catch((err) => console.error("Email send failed:", err));
    } catch (err) {
      console.error(err);
      toast.error("Failed to place order. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  if (done) {
    return (
      <div className="container-px mx-auto max-w-2xl py-24 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/15 text-success">
          <Check className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-3xl font-bold">Thank you for your order!</h1>
        <p className="mt-3 text-muted-foreground">
          {method === "mpesa"
            ? "Check your phone to complete the M-Pesa STK push payment."
            : "Your card payment is being processed."}{" "}
          We'll send confirmation by email shortly.
        </p>
        <Button variant="hero" size="lg" className="mt-8" asChild>
          <Link to="/shop">Continue shopping</Link>
        </Button>
      </div>
    );
  }

  if (!lines.length) {
    return (
      <div className="container-px mx-auto max-w-2xl py-24 text-center">
        <h1 className="text-3xl font-bold">Your cart is empty</h1>
        <Button variant="hero" className="mt-6" asChild>
          <Link to="/shop">Browse products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container-px mx-auto max-w-7xl py-10">
      <h1 className="text-3xl font-bold sm:text-4xl">Checkout</h1>

      <form onSubmit={placeOrder} className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          {/* Contact */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">Contact &amp; delivery</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (M-Pesa)</Label>
                <Input id="phone" name="phone" type="tel" placeholder="07XX XXX XXX" required />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Delivery address</Label>
                <Input id="address" name="address" placeholder="Street, building, apartment" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City / Town</Label>
                <Input id="city" name="city" defaultValue="Nairobi" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Delivery notes</Label>
                <Input id="notes" name="notes" placeholder="Optional" />
              </div>
            </div>
          </section>

          {/* Payment */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">Payment method</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setMethod("mpesa")}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                  method === "mpesa" ? "border-primary bg-primary/10" : "border-border"
                }`}
              >
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-success/15 text-success">
                  <Smartphone className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-medium">M-Pesa</span>
                  <span className="block text-xs text-muted-foreground">Pay via STK push</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => setMethod("card")}
                className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${
                  method === "card" ? "border-primary bg-primary/10" : "border-border"
                }`}
              >
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/15 text-primary">
                  <CreditCard className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-medium">Card</span>
                  <span className="block text-xs text-muted-foreground">Visa / Mastercard</span>
                </span>
              </button>
            </div>

            {method === "mpesa" ? (
              <p className="mt-4 rounded-xl bg-secondary/40 p-4 text-sm text-muted-foreground">
                Enter your M-Pesa number above. You'll receive an STK push to authorize payment of{" "}
                <span className="font-semibold text-foreground">{formatKES(total)}</span>.
              </p>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="card">Card number</Label>
                  <Input id="card" placeholder="1234 5678 9012 3456" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="exp">Expiry</Label>
                  <Input id="exp" placeholder="MM/YY" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvc">CVC</Label>
                  <Input id="cvc" placeholder="123" required />
                </div>
              </div>
            )}
          </section>
        </div>

        {/* Summary */}
        <aside className="h-fit rounded-2xl border border-border bg-card p-6 lg:sticky lg:top-24">
          <h2 className="text-lg font-semibold">Order summary</h2>
          <ul className="mt-4 space-y-3">
            {lines.map((l) => (
              <li key={l.product.id} className="flex items-center gap-3 text-sm">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-border bg-secondary/40">
                  <img src={l.product.images[0]} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="flex-1">
                  <p className="line-clamp-1 font-medium">{l.product.name}</p>
                  <p className="text-muted-foreground">Qty {l.quantity}</p>
                </div>
                <span>{formatKES(l.product.price_kes * l.quantity)}</span>
              </li>
            ))}
          </ul>
          {/* Coupon */}
          <div className="mt-4 border-t border-border pt-4">
            {appliedCode ? (
              <div className="flex items-center justify-between rounded-xl bg-success/10 px-3 py-2 text-sm">
                <span className="flex items-center gap-2 font-medium text-success">
                  <Tag className="h-4 w-4" /> {appliedCode.code}
                </span>
                <button onClick={removeCoupon} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Discount code"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), applyCoupon())}
                  className="h-9 text-sm uppercase"
                />
                <Button type="button" variant="outline" size="sm" onClick={applyCoupon} disabled={applyingCoupon || !couponInput.trim()}>
                  {applyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                </Button>
              </div>
            )}
          </div>

          <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatKES(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd>{formatKES(SHIPPING)}</dd>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-success">
                <dt>Discount ({appliedCode?.code})</dt>
                <dd>-{formatKES(discount)}</dd>
              </div>
            )}
          </dl>
          <div className="mt-4 flex justify-between border-t border-border pt-4 text-base font-bold">
            <span>Total</span>
            <span>{formatKES(total)}</span>
          </div>
          <Button type="submit" variant="hero" size="lg" className="mt-6 w-full" disabled={placing}>
            {placing && <Loader2 className="h-4 w-4 animate-spin" />}
            {method === "mpesa" ? "Pay with M-Pesa" : "Pay now"}
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Secure checkout • Your details are protected
          </p>
        </aside>
      </form>
    </div>
  );
}
