import type { Product } from "./types";

const KEY = "offgridit_recently_viewed";
const MAX = 8;

type RecentItem = Pick<Product, "id" | "name" | "slug" | "brand" | "images" | "price_kes" | "rating">;

function load(): RecentItem[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function trackProduct(product: Product) {
  const item: RecentItem = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    brand: product.brand,
    images: product.images,
    price_kes: product.price_kes,
    rating: product.rating,
  };
  const prev = load().filter((p) => p.id !== product.id);
  const next = [item, ...prev].slice(0, MAX);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
}

export function getRecentlyViewed(excludeId?: string): RecentItem[] {
  return load()
    .filter((p) => p.id !== excludeId)
    .slice(0, 4);
}
