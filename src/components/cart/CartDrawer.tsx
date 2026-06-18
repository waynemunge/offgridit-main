import { Link } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { formatKES } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function CartDrawer() {
  const { lines, isOpen, setOpen, subtotal, updateQty, removeItem, count } = useCart();

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-left">
            <ShoppingBag className="h-5 w-5" />
            Your Cart {count > 0 && <span className="text-muted-foreground">({count})</span>}
          </SheetTitle>
        </SheetHeader>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <ShoppingBag className="h-12 w-12 text-muted-foreground/40" />
            <div>
              <p className="font-medium">Your cart is empty</p>
              <p className="text-sm text-muted-foreground">Start adding some gear.</p>
            </div>
            <Button variant="hero" onClick={() => setOpen(false)} asChild>
              <Link to="/shop">Browse products</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <ul className="space-y-4">
                {lines.map((line) => (
                  <li key={line.product.id} className="flex gap-3">
                    <Link
                      to="/product/$slug"
                      params={{ slug: line.product.slug }}
                      onClick={() => setOpen(false)}
                      className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-secondary/40"
                    >
                      <img
                        src={line.product.images[0]}
                        alt={line.product.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </Link>
                    <div className="flex flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-sm font-medium leading-tight">
                          {line.product.name}
                        </p>
                        <button
                          aria-label="Remove item"
                          onClick={() => removeItem(line.product.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-sm font-semibold">{formatKES(line.product.price_kes)}</p>
                      <div className="mt-auto flex items-center gap-2">
                        <div className="flex items-center rounded-lg border border-border">
                          <button
                            aria-label="Decrease quantity"
                            className="px-2 py-1 text-muted-foreground hover:text-foreground disabled:opacity-40"
                            disabled={line.quantity <= 1}
                            onClick={() => updateQty(line.product.id, line.quantity - 1)}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm">{line.quantity}</span>
                          <button
                            aria-label="Increase quantity"
                            className="px-2 py-1 text-muted-foreground hover:text-foreground"
                            onClick={() => updateQty(line.product.id, line.quantity + 1)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-3 border-t border-border px-5 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-lg font-bold">{formatKES(subtotal)}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Shipping &amp; M-Pesa / card payment calculated at checkout.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setOpen(false)} asChild>
                  <Link to="/cart">View cart</Link>
                </Button>
                <Button variant="hero" onClick={() => setOpen(false)} asChild>
                  <Link to="/checkout">Checkout</Link>
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
