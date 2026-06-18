import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal, X } from "lucide-react";
import { productsQueryOptions } from "@/lib/products";
import { CATEGORIES } from "@/lib/types";
import { formatKES } from "@/lib/format";
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

interface ShopSearch {
  q?: string;
  category?: string;
  sale?: string;
}

export const Route = createFileRoute("/shop")({
  validateSearch: (search: Record<string, unknown>): ShopSearch => ({
    q: typeof search.q === "string" ? search.q : undefined,
    category: typeof search.category === "string" ? search.category : undefined,
    sale: typeof search.sale === "string" ? search.sale : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Shop All Gadgets — OffGridIt" },
      {
        name: "description",
        content:
          "Browse phones, laptops, tablets, audio, wearables and accessories. Filter by category, brand and price. Genuine tech with fast Kenya delivery.",
      },
    ],
  }),
  component: Shop,
});

const SORTS = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Top rated" },
];

const MAX_PRICE = 300000;

function Shop() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { data: products = [], isPending } = useQuery(productsQueryOptions);

  const [selectedCats, setSelectedCats] = useState<string[]>(
    search.category ? [search.category] : [],
  );
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState(MAX_PRICE);
  const [sort, setSort] = useState("featured");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const query = search.q ?? "";
  const onlySale = search.sale === "1";

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
    list = list.filter((p) => p.price_kes <= maxPrice);

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
  }, [products, query, selectedCats, selectedBrands, onlySale, maxPrice, sort]);

  const toggle = (arr: string[], set: (v: string[]) => void, value: string) =>
    set(arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]);

  const clearAll = () => {
    setSelectedCats([]);
    setSelectedBrands([]);
    setMaxPrice(MAX_PRICE);
    navigate({ search: {} as ShopSearch });
  };

  const FilterPanel = (
    <div className="space-y-8">
      <div>
        <h3 className="mb-3 text-sm font-semibold">Category</h3>
        <div className="space-y-2.5">
          {CATEGORIES.map((c) => (
            <label key={c} className="flex cursor-pointer items-center gap-2.5 text-sm">
              <Checkbox
                checked={selectedCats.includes(c)}
                onCheckedChange={() => toggle(selectedCats, setSelectedCats, c)}
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
                onCheckedChange={() => toggle(selectedBrands, setSelectedBrands, b)}
              />
              {b}
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold">Max price</h3>
        <Slider
          value={[maxPrice]}
          min={1000}
          max={MAX_PRICE}
          step={1000}
          onValueChange={(v) => setMaxPrice(v[0])}
        />
        <p className="mt-3 text-sm text-muted-foreground">Up to {formatKES(maxPrice)}</p>
      </div>

      <Button variant="outline" className="w-full" onClick={clearAll}>
        Clear filters
      </Button>
    </div>
  );

  return (
    <div className="container-px mx-auto max-w-7xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold sm:text-4xl">
          {query ? `Results for "${query}"` : "All products"}
        </h1>
        <p className="mt-2 text-muted-foreground">{filtered.length} products</p>
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
              <Select value={sort} onValueChange={setSort}>
                <SelectTrigger>
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
            <div className="rounded-2xl border border-border bg-card py-20 text-center">
              <p className="font-medium">No products match your filters.</p>
              <Button variant="ghost" className="mt-3" onClick={clearAll}>
                Reset filters
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
