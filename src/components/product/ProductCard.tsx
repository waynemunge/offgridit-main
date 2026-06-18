import { Link } from "@tanstack/react-router";
import { GitCompare, Heart, ShoppingCart, Star } from "lucide-react";
import type { Product } from "@/lib/types";
import { discountPercent, formatKES } from "@/lib/format";
import { useCart } from "@/lib/cart-context";
import { useWishlist } from "@/lib/wishlist-context";
import { useCompare } from "@/lib/compare-context";
import { Button } from "@/components/ui/button";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { toggle, isWished } = useWishlist();
  const { toggle: compareToggle, isInComparison } = useCompare();
  const wished = isWished(product.id);
  const comparing = isInComparison(product.id);
  const discount = discountPercent(product.price_kes, product.compare_at_price_kes);
  const image = product.images[0] ?? "/images/products/phone-aurora.jpg";

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-card)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/40">
      <Link
        to="/product/$slug"
        params={{ slug: product.slug }}
        className="relative block aspect-square overflow-hidden bg-secondary/40"
      >
        <img
          src={image}
          alt={product.name}
          loading="lazy"
          width={1024}
          height={1024}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex gap-2">
          {discount && (
            <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
              -{discount}%
            </span>
          )}
          {product.stock === 0 && (
            <span className="rounded-full bg-destructive px-2.5 py-1 text-xs font-semibold text-destructive-foreground">
              Sold out
            </span>
          )}
        </div>
        <button
          aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
          onClick={(e) => { e.preventDefault(); toggle(product); }}
          className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-background/80 backdrop-blur-sm transition-colors hover:bg-background"
        >
          <Heart className={`h-4 w-4 transition-colors ${wished ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
        </button>
      </Link>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="uppercase tracking-wide">{product.brand}</span>
          <span className="inline-flex items-center gap-1">
            <Star className="h-3 w-3 fill-primary text-primary" />
            {product.rating.toFixed(1)}
          </span>
        </div>
        <Link
          to="/product/$slug"
          params={{ slug: product.slug }}
          className="line-clamp-2 font-display text-base font-semibold leading-tight hover:text-primary"
        >
          {product.name}
        </Link>
        <div className="mt-auto flex items-end justify-between pt-2">
          <div>
            <div className="text-lg font-bold">{formatKES(product.price_kes)}</div>
            {product.compare_at_price_kes && (
              <div className="text-xs text-muted-foreground line-through">
                {formatKES(product.compare_at_price_kes)}
              </div>
            )}
          </div>
          <div className="flex gap-1.5">
            <Button
              size="icon"
              variant={comparing ? "outline" : "ghost"}
              aria-label={comparing ? "Remove from comparison" : "Add to comparison"}
              className={comparing ? "border-primary text-primary" : "text-muted-foreground"}
              onClick={() => compareToggle(product)}
            >
              <GitCompare className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="hero"
              aria-label={`Add ${product.name} to cart`}
              disabled={product.stock === 0}
              onClick={() => addItem(product)}
            >
              <ShoppingCart className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
