import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BadgeCheck,
  Headphones,
  Laptop,
  ShieldCheck,
  Smartphone,
  Tablet,
  Truck,
  Watch,
  Cable,
} from "lucide-react";
import { productsQueryOptions } from "@/lib/products";
import { useReveal } from "@/hooks/use-reveal";
import { ProductCard } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import heroImg from "@/assets/hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OffGridIt — Premium Gadgets & Tech in Kenya" },
      {
        name: "description",
        content:
          "Discover flagship phones, laptops, audio and accessories at OffGridIt. Genuine products, fast Kenya-wide delivery, M-Pesa & card checkout.",
      },
    ],
  }),
  component: Home,
});

const TRUST = [
  { icon: BadgeCheck, title: "Genuine products", desc: "100% authentic, sealed & verified" },
  { icon: Truck, title: "Fast delivery", desc: "Same-day in Nairobi, nationwide shipping" },
  { icon: ShieldCheck, title: "Warranty included", desc: "Up to 1-year manufacturer warranty" },
  { icon: Headphones, title: "Local support", desc: "Real humans, ready to help" },
];

const CATEGORY_TILES = [
  { name: "Phones", icon: Smartphone },
  { name: "Laptops", icon: Laptop },
  { name: "Tablets", icon: Tablet },
  { name: "Audio", icon: Headphones },
  { name: "Wearables", icon: Watch },
  { name: "Accessories", icon: Cable },
];

function Home() {
  const { data: products = [], isPending } = useQuery(productsQueryOptions);
  const featured = products.filter((p) => p.is_featured).slice(0, 8);
  const deals = products.filter((p) => p.is_on_sale).slice(0, 4);

  const trustRef = useReveal<HTMLDivElement>();
  const featRef = useReveal<HTMLDivElement>();
  const catRef = useReveal<HTMLDivElement>();
  const dealsRef = useReveal<HTMLDivElement>();

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0">
          <img
            src={heroImg}
            alt="Flagship smartphone with glowing edge light"
            width={1920}
            height={1080}
            className="h-full w-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
        </div>

        <div className="container-px relative mx-auto flex min-h-[88vh] max-w-7xl flex-col justify-center py-20">
          <div className="max-w-2xl animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              New arrivals just dropped
            </span>
            <h1 className="mt-6 text-5xl font-bold leading-[1.05] sm:text-6xl lg:text-7xl">
              Premium tech,
              <br />
              <span className="text-gradient">zero compromise.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-muted-foreground">
              Flagship phones, laptops, audio and more — genuine, warrantied and delivered fast
              across Kenya. Pay your way with M-Pesa or card.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button variant="hero" size="xl" asChild>
                <Link to="/shop">
                  Shop now <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="xl" asChild>
                <Link to="/shop">
                  See all deals
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section ref={trustRef} className="reveal border-b border-border bg-card/30">
        <div className="container-px mx-auto grid max-w-7xl grid-cols-2 gap-px py-2 lg:grid-cols-4">
          {TRUST.map((t) => (
            <div key={t.title} className="flex items-center gap-3 p-5">
              <t.icon className="h-7 w-7 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold">{t.title}</p>
                <p className="text-xs text-muted-foreground">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED */}
      <section ref={featRef} className="reveal container-px mx-auto max-w-7xl py-20">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold sm:text-4xl">Featured products</h2>
            <p className="mt-2 text-muted-foreground">Hand-picked gear our customers love.</p>
          </div>
          <Button variant="ghost" asChild className="hidden sm:inline-flex">
            <Link to="/shop">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {isPending
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
                  <Skeleton className="aspect-square w-full rounded-none" />
                  <div className="space-y-2 p-4">
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ))
            : featured.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* CATEGORIES */}
      <section ref={catRef} className="reveal border-y border-border bg-card/30 py-20">
        <div className="container-px mx-auto max-w-7xl">
          <h2 className="mb-8 text-3xl font-bold sm:text-4xl">Shop by category</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {CATEGORY_TILES.map((c) => (
              <Link
                key={c.name}
                to="/shop"
                search={{ category: c.name } as any}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-[var(--shadow-glow)]"
              >
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <c.icon className="h-6 w-6" />
                </span>
                <span className="text-sm font-medium">{c.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* DEALS */}
      <section ref={dealsRef} className="reveal container-px mx-auto max-w-7xl py-20">
        <div className="overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-6 sm:p-10">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-sm font-semibold uppercase tracking-wide text-primary">
                Limited time
              </span>
              <h2 className="mt-1 text-3xl font-bold sm:text-4xl">Deals &amp; savings</h2>
            </div>
            <Button variant="hero" asChild>
              <Link to="/shop" search={{ sale: "1" } as any}>
                See all deals <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4">
            {isPending
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
                    <Skeleton className="aspect-square w-full rounded-none" />
                    <div className="space-y-2 p-4">
                      <Skeleton className="h-3 w-1/3" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                    </div>
                  </div>
                ))
              : deals.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      </section>
    </div>
  );
}
