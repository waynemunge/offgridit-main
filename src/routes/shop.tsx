import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { productsQueryOptions } from "@/lib/products";
import { CATEGORIES } from "@/lib/types";
import { formatKES } from "@/lib/format";
import { seo } from "@/lib/site";
import { ProductCard } from "@/components/product/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SORTS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Top rated" },
] as const;

type SortValue = (typeof SORTS)[number]["value"];

// Every filter lives in the URL so a filtered view can be shared or bookmarked,
// e.g. /shop?category=Phones,Audio&brand=Apple&max=150000&sort=price-asc
export interface ShopSearch {
  q?: string;
  /** Comma-separated categories. */
  category?: string;
  /** Comma-separated brands. */
  brand?: string;
  max?: number;
  sort?: SortValue;
  sale?: "1";
}

const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const splitList = (v?: string) => (v ? v.split(",").filter(Boolean) : []);
const joinList = (values: string[]) => (values.length ? values.join(",") : undefined);

export const Route = createFileRoute("/shop")({
  validateSearch: (search: Record<string, unknown>): ShopSearch => {
    const max = Number(search.max);
    const sort = SORTS.find((s) => s.value === search.sort)?.value;
    return {
      q: text(search.q),
      category: text(search.category),
      brand: text(search.brand),
      max: Number.isFinite(max) && max > 0 ? max : undefined,
      sort: sort === "featured" ? undefined : sort,
      sale: search.sale === "1" || search.sale === 1 ? "1" : undefined,
    };
  },
  head: ({ match }) => {
    // A single-category view gets its own title and canonical URL; any other
    // filter combination points search engines at the main shop page.
    const cats = splitList(match.search.category);
    const category = cats.length === 1 ? CATEGORIES.find((c) => c === cats[0]) : undefined;
    return category
      ? seo({
          title: `${category} in Kenya — OffGridIt`,
          description: `Shop genuine ${category.toLowerCase()} at OffGridIt. Warranty included, pay with M-Pesa, pickup or delivery arranged by call or WhatsApp.`,
          path: `/shop?category=${encodeURIComponent(category)}`,
        })
      : seo({
          title: "Shop All Gadgets — OffGridIt",
          description:
            "Browse phones, laptops, tablets, audio, wearables and accessories. Filter by category, brand and price. Genuine tech in Kenya, pay with M-Pesa.",
          path: "/shop",
        });
  },
  component: Shop,
});

const PRICE_STEP = 1000;

function Shop() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: products = [], isPending } = useQuery(productsQueryOptions);

  const query = search.q ?? "";
  const selectedCats = useMemo(() => splitList(search.category), [search.category]);
  const selectedBrands = useMemo(() => splitList(search.brand), [search.brand]);
  const sort: SortValue = search.sort ?? "featured";
  const onlySale = search.sale === "1";

  // The slider tops out at the most expensive product, so nothing is hidden by default.
  const priceCeiling = useMemo(() => {
    const top = Math.max(0, ...products.map((p) => p.price_kes));
    return Math.max(PRICE_STEP, Math.ceil(top / PRICE_STEP) * PRICE_STEP);
  }, [products]);
  const maxPrice = Math.min(search.max ?? priceCeiling, priceCeiling);
  // Local while dragging; written to the URL when the thumb is released.
  const [dragPrice, setDragPrice] = useState<number | null>(null);
  const shownPrice = dragPrice ?? maxPrice;

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(query);
  useEffect(() => setSearchInput(query), [query]);

  // Filter changes replace the history entry, so Back leaves the shop instead of
  // stepping through every checkbox click.
  const setSearch = (patch: Partial<ShopSearch>) =>
    navigate({ search: (s) => ({ ...s, ...patch }), replace: true, resetScroll: false });

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate({ search: (s) => ({ ...s, q: searchInput.trim() || undefined }) });
  };

  const brands = useMemo(
    () => Array.from(new Set(products.map((p) => p.brand))).sort(),
    [products],
  );

  const filtered = useMemo(() => {
    let list = products.slice();
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      );
    }
    if (selectedCats.length) list = list.filter((p) => selectedCats.includes(p.category));
    if (selectedBrands.length) list = list.filter((p) => selectedBrands.includes(p.brand));
    if (onlySale) list = list.filter((p) => p.is_on_sale);
    if (search.max) {
      const max = search.max;
      list = list.filter((p) => p.price_kes <= max);
    }

    switch (sort) {
      case "price-asc":
        list.sort((a, b) => a.price_kes - b.price_kes);
        break;
      case "price-desc":
        list.sort((a, b) => b.price_kes - a.price_kes);
        break;
      case "rating":
        list.sort((a, b) => b.rating - a.rating);
        break;
      case "newest":
        list.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
        break;
      default:
        list.sort((a, b) => Number(b.is_featured) - Number(a.is_featured));
    }
    return list;
  }, [products, query, selectedCats, selectedBrands, onlySale, search.max, sort]);

  const toggleIn = (values: string[], value: string) =>
    joinList(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);

  const hasFilters = Boolean(
    query || selectedCats.length || selectedBrands.length || search.max || onlySale,
  );

  const clearAll = () => {
    setSearchInput("");
    setDragPrice(null);
    navigate({ search: (s) => ({ sort: s.sort }) });
  };

  const heading = selectedCats.length === 1 ? selectedCats[0] : onlySale ? "Deals" : "All products";

  const FilterPanel = (
    <div className="space-y-8">
      <div>
        <h3 className="mb-3 text-sm font-semibold">Category</h3>
        <div className="space-y-2.5">
          {CATEGORIES.map((c) => (
            <label key={c} className="flex cursor-pointer items-center gap-2.5 text-sm">
              <Checkbox
                checked={selectedCats.includes(c)}
                onCheckedChange={() => setSearch({ category: toggleIn(selectedCats, c) })}
              />
              {c}
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold">Brand</h3>
        <div className="space-y-2.5">
          {brands.map((b) => (
            <label key={b} className="flex cursor-pointer items-center gap-2.5 text-sm">
              <Checkbox
                checked={selectedBrands.includes(b)}
                onCheckedChange={() => setSearch({ brand: toggleIn(selectedBrands, b) })}
              />
              {b}
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold">Max price</h3>
        <Slider
          value={[shownPrice]}
          min={PRICE_STEP}
          max={priceCeiling}
          step={PRICE_STEP}
          onValueChange={(v) => setDragPrice(v[0])}
          onValueCommit={(v) => {
            setDragPrice(null);
            setSearch({ max: v[0] >= priceCeiling ? undefined : v[0] });
          }}
        />
        <p className="mt-3 text-sm text-muted-foreground">
          {shownPrice >= priceCeiling ? "Any price" : `Up to ${formatKES(shownPrice)}`}
        </p>
      </div>

      {onlySale && (
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <Checkbox checked onCheckedChange={() => setSearch({ sale: undefined })} />
          On sale only
        </label>
      )}

      <Button variant="outline" className="w-full" onClick={clearAll} disabled={!hasFilters}>
        Clear filters
      </Button>
    </div>
  );

  return (
    <div className="container-px mx-auto max-w-7xl py-10">
      <div className="mb-8">
        {query ? (
          <>
            <p className="text-sm text-muted-foreground">Search results for</p>
            <h1 className="mt-1 text-3xl font-bold sm:text-4xl">"{query}"</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {filtered.length} product{filtered.length !== 1 ? "s" : ""} found
            </p>
            <form onSubmit={submitSearch} className="relative mt-4 max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Refine your search..."
                className="pl-9 pr-20"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
              >
                Search
              </button>
            </form>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold sm:text-4xl">{heading}</h1>
            <p className="mt-2 text-muted-foreground">
              {filtered.length} product{filtered.length !== 1 ? "s" : ""}
            </p>
          </>
        )}
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-24">{FilterPanel}</div>
        </aside>

        <div className="flex-1">
          <div className="mb-6 flex items-center justify-between gap-3">
            <Button
              variant="outline"
              className="lg:hidden"
              onClick={() => setFiltersOpen((o) => !o)}
            >
              <SlidersHorizontal className="h-4 w-4" /> Filters
            </Button>
            <div className="ml-auto w-44">
              <Select
                value={sort}
                onValueChange={(v) =>
                  setSearch({ sort: v === "featured" ? undefined : (v as SortValue) })
                }
              >
                <SelectTrigger aria-label="Sort products">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORTS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {filtersOpen && (
            <div className="mb-6 rounded-2xl border border-border bg-card p-5 lg:hidden">
              <div className="mb-4 flex items-center justify-between">
                <span className="font-semibold">Filters</span>
                <button onClick={() => setFiltersOpen(false)} aria-label="Close filters">
                  <X className="h-5 w-5" />
                </button>
              </div>
              {FilterPanel}
            </div>
          )}

          {isPending ? (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
                  <Skeleton className="aspect-square w-full rounded-none" />
                  <div className="space-y-2 p-4">
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card px-6 py-20 text-center">
              <Search className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <p className="mt-4 text-lg font-semibold">
                {query ? `No results for "${query}"` : "No products match your filters"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {query
                  ? "Try a different word, or browse by category below."
                  : "Try adjusting your filters."}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {query &&
                  CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setSearchInput("");
                        navigate({ search: { category: cat, sort: search.sort } });
                      }}
                      className="rounded-full border border-border bg-secondary/50 px-3 py-1.5 text-sm font-medium hover:border-primary/50 hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                      {cat}
                    </button>
                  ))}
              </div>
              <Button variant="ghost" className="mt-4" onClick={clearAll}>
                {query ? "Clear search" : "Reset filters"}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
