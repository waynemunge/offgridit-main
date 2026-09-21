import type { CartViewLine } from "@/lib/cart-context";

/** Stock note under a cart line: sold out, no longer sold, or only a few left. */
export function CartLineStatus({ line }: { line: CartViewLine }) {
  if (line.status === "sold-out") {
    return <p className="text-xs font-medium text-destructive">Sold out — please remove</p>;
  }
  if (line.status === "unavailable") {
    return (
      <p className="text-xs font-medium text-destructive">No longer available — please remove</p>
    );
  }
  if (line.quantity >= line.maxQty && line.maxQty <= 5) {
    return (
      <p className="text-xs font-medium text-orange-500">
        {line.maxQty === 1 ? "Last one" : `Only ${line.maxQty} left`}
      </p>
    );
  }
  return null;
}
