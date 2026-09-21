import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Check, CreditCard, Loader2, MessageCircle, Smartphone, Tag, X } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/lib/cart-context";
import { validateDiscountCode } from "@/lib/api/discount.functions";
import { placeOrder } from "@/lib/api/orders.functions";
import { formatKES } from "@/lib/format";
import { FULFILMENT_NOTE, NO_INDEX, WHATSAPP_URL } from "@/lib/site";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — OffGridIt" }, NO_INDEX] }),
  component: Checkout,
});

type AppliedCode = {
  id: string;
  code: string;
  discount: number;
  type: "percentage" | "fixed";
  value: number;
};
type PlacedOrder = { orderId: string; total: number; method: "mpesa" | "card" };

function Checkout() {
  const qc = useQueryClient();
  const { lines, subtotal, clearCart, hasUnavailable } = useCart();
  const [method, setMethod] = useState<"mpesa" | "card">("mpesa");
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [appliedCode, setAppliedCode] = useState<AppliedCode | null>(null);

  // Preview only — the server recalculates prices and the discount when the order is placed.
  const discount = appliedCode?.discount ?? 0;
  const total = Math.max(0, subtotal - discount);

  const applyCoupon = async () => {
    if (!couponInput.trim()) return;
    setApplyingCoupon(true);
    try {
      const result = await validateDiscountCode({
        data: { code: couponInput, orderTotal: subtotal },
      });
      setAppliedCode(result);
      toast.success(
        `Code applied — ${result.type === "percentage" ? `${result.value}%` : formatKES(result.value)} off!`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCode(null);
    setCouponInput("");
  };

  const submitOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!lines.length) return;
    const fd = new FormData(e.currentTarget);
    setPlacing(true);
    try {
      const result = await placeOrder({
        data: {
          paymentMethod: method,
          fullName: String(fd.get("name") ?? ""),
          email: String(fd.get("email") ?? ""),
          phone: String(fd.get("phone") ?? ""),
          notes: String(fd.get("notes") ?? "") || undefined,
          discountCode: appliedCode?.code,
          items: lines.map((l) => ({
            productId: l.product.id,
            quantity: l.quantity,
            variant: l.variant,
          })),
        },
      });
      setPlaced({ orderId: result.orderId, total: result.total, method });
      clearCart();
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Order placed!");
    } catch (err) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : "Failed to place order. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  if (placed) {
    const ref = placed.orderId.slice(0, 8).toUpperCase();
    const waText = `Hi OffGridIt, I just placed order #${ref} (${formatKES(placed.total)}). I'd like to arrange payment and pickup/delivery.`;
    return (
      <div className="container-px mx-auto max-w-2xl py-24 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/15 text-success">
          <Check className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-3xl font-bold">Thank you for your order!</h1>
        <p className="mt-2 font-mono text-lg text-primary">#{ref}</p>
        <p className="mt-4 text-muted-foreground">
          We'll call or WhatsApp you shortly to confirm your order,{" "}
          {placed.method === "mpesa" ? "share the M-Pesa payment details" : "arrange card payment"}{" "}
          and agree on pickup or delivery. A confirmation has been sent to your email.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button variant="hero" size="lg" asChild>
            <a
              href={`${WHATSAPP_URL}?text=${encodeURIComponent(waText)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="h-5 w-5" /> Chat on WhatsApp
            </a>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link to="/shop">Continue shopping</Link>
          </Button>
        </div>
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

  if (hasUnavailable) {
    return (
      <div className="container-px mx-auto max-w-2xl py-24 text-center">
        <h1 className="text-3xl font-bold">Some items just sold out</h1>
        <p className="mt-3 text-muted-foreground">
          Remove them from your cart to continue with the rest of your order.
        </p>
        <Button variant="hero" className="mt-6" asChild>
          <Link to="/cart">Review cart</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container-px mx-auto max-w-7xl py-10">
      <h1 className="text-3xl font-bold sm:text-4xl">Checkout</h1>

      <form onSubmit={submitOrder} className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-8">
          {/* Contact */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">Contact details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="checkout-name">Full name</Label>
                <Input
                  id="checkout-name"
                  name="name"
                  autoComplete="name"
                  maxLength={100}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkout-phone">Phone (M-Pesa / WhatsApp)</Label>
                <Input
                  id="checkout-phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="07XX XXX XXX"
                  pattern="\+?[0-9\s\-]{9,20}"
                  title="Enter a valid phone number"
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="checkout-email">Email</Label>
                <Input
                  id="checkout-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="checkout-notes">Notes</Label>
                <Input
                  id="checkout-notes"
                  name="notes"
                  maxLength={500}
                  placeholder="Optional — e.g. your area, or the best time to reach you"
                />
              </div>
            </div>
            <p className="mt-4 rounded-xl bg-secondary/40 p-4 text-sm text-muted-foreground">
              {FULFILMENT_NOTE}
            </p>
          </section>

          {/* Payment */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-lg font-semibold">How would you like to pay?</h2>
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
                  <span className="block text-xs text-muted-foreground">
                    Details sent after you order
                  </span>
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

            <p className="mt-4 rounded-xl bg-secondary/40 p-4 text-sm text-muted-foreground">
              No payment is taken on this page. After you place your order we'll call or WhatsApp
              you to confirm it and{" "}
              {method === "mpesa" ? (
                <>
                  share the M-Pesa details for{" "}
                  <span className="font-semibold text-foreground">{formatKES(total)}</span>.
                </>
              ) : (
                <>
                  arrange card payment of{" "}
                  <span className="font-semibold text-foreground">{formatKES(total)}</span>.
                </>
              )}
            </p>
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
                  <p className="text-muted-foreground">
                    Qty {l.quantity}
                    {l.variant && ` · ${l.variant}`}
                  </p>
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
                <button
                  type="button"
                  aria-label="Remove discount code"
                  onClick={removeCoupon}
                  className="text-muted-foreground hover:text-foreground"
                >
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
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={applyCoupon}
                  disabled={applyingCoupon || !couponInput.trim()}
                >
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
              <dt className="text-muted-foreground">Pickup / delivery</dt>
              <dd className="text-muted-foreground">Arranged after order</dd>
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
            Place order
          </Button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            No payment is taken now • We'll contact you to confirm
          </p>
        </aside>
      </form>
    </div>
  );
}
