import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useWishlist } from "@/lib/wishlist-context";
import { ProductCard } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/wishlist")({
  head: () => ({ meta: [{ title: "Wishlist — OffGridIt" }] }),
  component: WishlistPage,
});

function WishlistPage() {
  const { items, count } = useWishlist();

  if (count === 0) {
    return (
      <div className="container-px mx-auto max-w-xl py-24 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-destructive/10 text-destructive">
          <Heart className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-3xl font-bold">Your wishlist is empty</h1>
        <p className="mt-3 text-muted-foreground">
          Tap the heart on any product to save it here.
        </p>
        <Button variant="hero" size="lg" className="mt-8" asChild>
          <Link to="/shop">Browse products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container-px mx-auto max-w-7xl py-10">
      <h1 className="mb-2 text-3xl font-bold">Wishlist</h1>
      <p className="mb-8 text-muted-foreground">
        {count} saved item{count !== 1 ? "s" : ""}
      </p>
      <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
