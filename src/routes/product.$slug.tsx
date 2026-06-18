import { useEffect, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Bell, Check, ChevronRight, Minus, Plus, ShoppingCart, Star, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { fetchProductBySlug, productsQueryOptions } from "@/lib/products";
import { trackProduct, getRecentlyViewed } from "@/lib/recently-viewed";
import { discountPercent, formatKES } from "@/lib/format";
import { useCart } from "@/lib/cart-context";
import { useAuth } from "@/lib/auth-context";
import { useAuthModal } from "@/lib/auth-modal";
import { supabase } from "@/integrations/supabase/client";
import { submitReview, deleteReview } from "@/lib/api/reviews.functions";
import { subscribeToRestock } from "@/lib/api/notifications.functions";
import { CountdownTimer } from "@/components/product/CountdownTimer";
import { ProductCard } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/product/$slug")({
  loader: async ({ params, context }) => {
    const product = await context.queryClient.ensureQueryData({
      queryKey: ["product", params.slug],
      queryFn: () => fetchProductBySlug(params.slug),
    });
    if (!product) throw notFound();
    return product;
  },
  head: ({ loaderData: p }) => {
    if (!p) return {};
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.name,
      description: p.description ?? p.name,
      image: p.images,
      brand: { "@type": "Brand", name: p.brand },
      offers: {
        "@type": "Offer",
        priceCurrency: "KES",
        price: p.price_kes,
        availability:
          p.stock > 0
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock",
        url: `https://offgridit.co.ke/product/${p.slug}`,
      },
      ...(p.rating > 0
        ? {
            aggregateRating: {
              "@type": "AggregateRating",
              ratingValue: p.rating,
              bestRating: 5,
              worstRating: 1,
            },
          }
        : {}),
    };
    return {
      meta: [
        { title: `${p.name} — OffGridIt` },
        { name: "description", content: p.description ?? p.name },
        { property: "og:title", content: `${p.name} — OffGridIt` },
        { property: "og:description", content: p.description ?? p.name },
        { property: "og:image", content: p.images[0] ?? "" },
      ],
      scripts: [
        { type: "application/ld+json", children: JSON.stringify(jsonLd) },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://offgridit.co.ke/" },
              { "@type": "ListItem", position: 2, name: p.category, item: `https://offgridit.co.ke/shop?category=${encodeURIComponent(p.category)}` },
              { "@type": "ListItem", position: 3, name: p.name },
            ],
          }),
        },
      ],
    };
  },
  component: ProductDetail,
  notFoundComponent: () => (
    <div className="container-px mx-auto max-w-7xl py-24 text-center">
      <h1 className="text-3xl font-bold">Product not found</h1>
      <Button variant="hero" className="mt-6" asChild>
        <Link to="/shop">Back to shop</Link>
      </Button>
    </div>
  ),
  errorComponent: () => (
    <div className="container-px mx-auto max-w-7xl py-24 text-center">
      <h1 className="text-2xl font-bold">Couldn't load this product</h1>
      <Button variant="hero" className="mt-6" asChild>
        <Link to="/shop">Back to shop</Link>
      </Button>
    </div>
  ),
});

function ProductDetail() {
  const product = Route.useLoaderData();
  const { addItem } = useCart();
  const { data: all = [] } = useQuery(productsQueryOptions);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>(() =>
    Object.fromEntries((product.variants ?? []).map((g) => [g.name, g.options[0] ?? ""]))
  );
  const variantLabel = Object.entries(selectedVariants).map(([, v]) => v).filter(Boolean).join(" / ") || undefined;
  const [recentItems, setRecentItems] = useState(() => getRecentlyViewed(product.id));

  useEffect(() => {
    trackProduct(product);
    setRecentItems(getRecentlyViewed(product.id));
  }, [product.id]);

  const discount = discountPercent(product.price_kes, product.compare_at_price_kes);
  const inStock = product.stock > 0;
  const related = all
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4);
  const specs = Object.entries(product.specs) as [string, string][];
  const images = product.images.length ? product.images : ["/images/products/phone-aurora.jpg"];

  return (
    <div className="container-px mx-auto max-w-7xl py-8">
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/" className="hover:text-foreground">Home</Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <Link to="/shop" search={{ category: product.category } as any} className="hover:text-foreground">
          {product.category}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="line-clamp-1 text-foreground font-medium">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Gallery */}
        <div className="space-y-4">
          <div className="aspect-square overflow-hidden rounded-3xl border border-border bg-secondary/40">
            <img
              src={images[activeImg]}
              alt={product.name}
              width={1024}
              height={1024}
              className="h-full w-full object-cover"
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-3">
              {images.map((img: string, i: number) => (
                <button
                  key={img}
                  onClick={() => setActiveImg(i)}
                  className={`h-20 w-20 overflow-hidden rounded-xl border ${
                    i === activeImg ? "border-primary" : "border-border"
                  }`}
                >
                  <img src={img} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="uppercase tracking-wide">{product.brand}</span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <Star className="h-4 w-4 fill-primary text-primary" /> {product.rating.toFixed(1)}
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{product.name}</h1>

          <div className="mt-5 flex items-end gap-3">
            <span className="text-3xl font-bold">{formatKES(product.price_kes)}</span>
            {product.compare_at_price_kes && (
              <span className="pb-1 text-lg text-muted-foreground line-through">
                {formatKES(product.compare_at_price_kes)}
              </span>
            )}
            {discount && (
              <span className="mb-1 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
                Save {discount}%
              </span>
            )}
          </div>

          {product.is_on_sale && product.sale_ends_at && (
            <CountdownTimer endsAt={product.sale_ends_at} />
          )}

          <p className="mt-5 text-muted-foreground">{product.description}</p>

          {(product.variants ?? []).length > 0 && (
            <div className="mt-6 space-y-4">
              {(product.variants ?? []).map((group) => (
                <div key={group.name}>
                  <p className="mb-2 text-sm font-semibold">
                    {group.name}:{" "}
                    <span className="font-normal text-muted-foreground">{selectedVariants[group.name]}</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.options.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setSelectedVariants((p) => ({ ...p, [group.name]: opt }))}
                        className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                          selectedVariants[group.name] === opt
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 flex items-center gap-2 text-sm">
            {product.stock === 0 ? (
              <span className="font-medium text-destructive">Out of stock</span>
            ) : product.stock <= 5 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1 font-semibold text-orange-500">
                <AlertTriangle className="h-4 w-4" /> Only {product.stock} left — order soon!
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 font-medium text-success">
                <Check className="h-4 w-4" /> In stock ({product.stock} available)
              </span>
            )}
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-4">
            <div className="flex items-center rounded-xl border border-border">
              <button
                aria-label="Decrease"
                className="px-3 py-3 text-muted-foreground hover:text-foreground disabled:opacity-40"
                disabled={qty <= 1}
                onClick={() => setQty((q) => Math.max(1, q - 1))}
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-10 text-center font-medium">{qty}</span>
              <button
                aria-label="Increase"
                className="px-3 py-3 text-muted-foreground hover:text-foreground disabled:opacity-40"
                disabled={qty >= product.stock}
                onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <Button
              variant="hero"
              size="lg"
              className="flex-1"
              disabled={!inStock}
              onClick={() => addItem(product, qty, variantLabel)}
            >
              <ShoppingCart className="h-5 w-5" /> Add to cart
            </Button>
          </div>

          {!inStock && <RestockForm productId={product.id} />}

          <div className="mt-5 flex items-center gap-2 rounded-xl border border-border bg-card/50 p-4 text-sm text-muted-foreground">
            <Truck className="h-5 w-5 text-primary" />
            Free delivery in Nairobi over {formatKES(50000)} • M-Pesa &amp; card accepted
          </div>

          {specs.length > 0 && (
            <div className="mt-8">
              <h2 className="mb-3 text-lg font-semibold">Specifications</h2>
              <div className="overflow-hidden rounded-2xl border border-border">
                <table className="w-full text-sm">
                  <tbody>
                    {specs.map(([k, v], i) => (
                      <tr key={k} className={i % 2 ? "bg-card/40" : ""}>
                        <td className="w-1/3 px-4 py-3 font-medium text-muted-foreground">{k}</td>
                        <td className="px-4 py-3">{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      <ReviewsSection productId={product.id} />

      {recentItems.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-6 text-2xl font-bold">Recently viewed</h2>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
            {recentItems.map((item) => (
              <Link
                key={item.id}
                to="/product/$slug"
                params={{ slug: item.slug }}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-1 hover:border-primary/40"
              >
                <div className="aspect-square overflow-hidden bg-secondary/40">
                  <img
                    src={item.images[0] ?? "/images/products/phone-aurora.jpg"}
                    alt={item.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="flex flex-col gap-1 p-3">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">{item.brand}</span>
                  <span className="line-clamp-2 text-sm font-semibold leading-tight">{item.name}</span>
                  <span className="mt-1 text-sm font-bold">{formatKES(item.price_kes)}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-6 text-2xl font-bold">You might also like</h2>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function RestockForm({ productId }: { productId: string }) {
  const { user } = useAuth();
  const [email, setEmail] = useState(user?.email ?? "");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      await subscribeToRestock({ data: { productId, email: email.trim() } });
      setSubmitted(true);
      toast.success("We'll notify you when this is back in stock!");
    } catch {
      toast.error("Couldn't subscribe. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="mt-5 flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-success">
        <Bell className="h-4 w-4 shrink-0" />
        You're on the list — we'll email you when it's back!
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-xl border border-border bg-card/50 p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Bell className="h-4 w-4 text-primary" /> Get notified when back in stock
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-9 text-sm"
        />
        <Button type="submit" size="sm" variant="outline" disabled={loading}>
          {loading ? "…" : "Notify me"}
        </Button>
      </form>
    </div>
  );
}

type Review = {
  id: string;
  user_id: string;
  reviewer_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          aria-label={`${s} star${s !== 1 ? "s" : ""}`}
        >
          <Star
            className={`h-6 w-6 transition-colors ${
              s <= (hovered || value)
                ? "fill-primary text-primary"
                : "text-muted-foreground"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-4 w-4 ${s <= rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

function ReviewsSection({ productId }: { productId: string }) {
  const { user } = useAuth();
  const { openAuth } = useAuthModal();
  const qc = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["reviews", productId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("reviews")
        .select("id, user_id, reviewer_name, rating, comment, created_at")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Review[];
    },
  });

  const myReview = user ? reviews.find((r) => r.user_id === user.id) : null;

  const submitMutation = useMutation({
    mutationFn: () =>
      submitReview({
        data: {
          productId,
          rating,
          comment: comment.trim() || undefined,
          reviewerName: user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Customer",
        },
      }),
    onSuccess: () => {
      toast.success("Review submitted!");
      setRating(0);
      setComment("");
      qc.invalidateQueries({ queryKey: ["reviews", productId] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: () => toast.error("Failed to submit review"),
  });

  const deleteMutation = useMutation({
    mutationFn: (reviewId: string) => deleteReview({ data: { reviewId } }),
    onSuccess: () => {
      toast.success("Review deleted");
      qc.invalidateQueries({ queryKey: ["reviews", productId] });
      qc.invalidateQueries({ queryKey: ["products"] });
    },
    onError: () => toast.error("Failed to delete review"),
  });

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  return (
    <section className="mt-20">
      <h2 className="mb-6 text-2xl font-bold">Customer reviews</h2>

      {/* Summary */}
      {reviews.length > 0 && (
        <div className="mb-8 flex items-center gap-4">
          <span className="text-5xl font-bold">{avgRating.toFixed(1)}</span>
          <div>
            <StarDisplay rating={Math.round(avgRating)} />
            <p className="mt-1 text-sm text-muted-foreground">
              {reviews.length} review{reviews.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      )}

      {/* Submit form */}
      {!myReview && (
        <div className="mb-10 rounded-2xl border border-border bg-card p-6">
          <h3 className="mb-4 font-semibold">Leave a review</h3>
          {user ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (rating === 0) { toast.error("Please select a star rating"); return; }
                submitMutation.mutate();
              }}
              className="space-y-4"
            >
              <StarInput value={rating} onChange={setRating} />
              <Textarea
                placeholder="Share your experience (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                maxLength={1000}
              />
              <Button
                type="submit"
                variant="hero"
                disabled={submitMutation.isPending || rating === 0}
              >
                {submitMutation.isPending ? "Submitting…" : "Submit review"}
              </Button>
            </form>
          ) : (
            <div className="text-sm text-muted-foreground">
              <Button variant="link" className="h-auto p-0" onClick={openAuth}>
                Sign in
              </Button>{" "}
              to leave a review.
            </div>
          )}
        </div>
      )}

      {/* Reviews list */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews yet. Be the first!</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold">{review.reviewer_name}</p>
                  <StarDisplay rating={review.rating} />
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>
                    {new Date(review.created_at).toLocaleDateString("en-KE", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </span>
                  {user?.id === review.user_id && (
                    <button
                      onClick={() => deleteMutation.mutate(review.id)}
                      disabled={deleteMutation.isPending}
                      aria-label="Delete review"
                      className="text-destructive hover:text-destructive/80"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              {review.comment && (
                <p className="mt-3 text-sm text-muted-foreground">{review.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
