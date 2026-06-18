import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { formatKES } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Your Cart — OffGridIt" }] }),
  component: CartPage,
});

function CartPage() {
  const { lines, subtotal, updateQty, removeItem, count } = useCart();

  if (lines.length === 0) {
    return (
      <div className="container-px mx-auto max-w-3xl py-24 text-center">
        <ShoppingBag className="mx-auto h-14 w-14 text-muted-foreground/40" />
        <h1 className="mt-6 text-3xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Discover premium gear built to last.</p>
        <Button variant="hero" size="lg" className="mt-8" asChild>
          <Link to="/shop">Start shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container-px mx-auto max-w-7xl py-10">
      <h1 className="text-3xl font-bold sm:text-4xl">Your cart</h1>
      <p className="mt-2 text-muted-foreground">{count} item{count !== 1 && "s"}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <ul className="space-y-4">
          {lines.map((line) => (
            <li
              key={line.product.id}
              className="flex gap-4 rounded-2xl border border-border bg-card p-4"
            >
              <Link
                to="/product/$slug"
                params={{ slug: line.product.slug }}
                className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-border bg-secondary/40"
              >
                <img
                  src={line.product.images[0]}
                  alt={line.product.name}
                  className="h-full w-full object-cover"
                />
              </Link>
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    to="/product/$slug"
                    params={{ slug: line.product.slug }}
                    className="font-medium hover:text-primary"
                  >
                    {line.product.name}
                  </Link>
                  <button
                    aria-label="Remove"
                    onClick={() => removeItem(line.product.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground">{line.product.brand}</p>
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center rounded-lg border border-border">
                    <button
                      aria-label="Decrease"
                      className="px-2.5 py-1.5 text-muted-foreground hover:text-foreground disabled:opacity-40"
                      disabled={line.quantity <= 1}
                      onClick={() => updateQty(line.product.id, line.quantity - 1)}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-9 text-center text-sm">{line.quantity}</span>
                    <button
                      aria-label="Increase"
                      className="px-2.5 py-1.5 text-muted-foreground hover:text-foreground"
                      onClick={() => updateQty(line.product.id, line.quantity + 1)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <span className="font-semibold">
                    {formatKES(line.product.price_kes * line.quantity)}
                  </span>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-2xl border border-border bg-card p-6 lg:sticky lg:top-24">
          <h2 className="text-lg font-semibold">Order summary</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd>{formatKES(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd className="text-muted-foreground">Calculated at checkout</dd>
            </div>
          </dl>
          <div className="mt-4 flex justify-between border-t border-border pt-4 text-base font-bold">
            <span>Total</span>
            <span>{formatKES(subtotal)}</span>
          </div>
          <Button variant="hero" size="lg" className="mt-6 w-full" asChild>
            <Link to="/checkout">Proceed to checkout</Link>
          </Button>
          <Button variant="ghost" className="mt-2 w-full" asChild>
            <Link to="/shop">Continue shopping</Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}
