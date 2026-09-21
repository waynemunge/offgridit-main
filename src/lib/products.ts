import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { Product, ProductStatus, ProductVariantGroup } from "./types";

// numeric columns arrive as strings; JSON columns need a shape check.
function normalize(row: Tables<"products">): Product {
  return {
    ...row,
    price_kes: Number(row.price_kes),
    compare_at_price_kes:
      row.compare_at_price_kes != null ? Number(row.compare_at_price_kes) : null,
    rating: Number(row.rating),
    status: row.status as ProductStatus,
    images: Array.isArray(row.images) ? (row.images as string[]) : [],
    specs:
      row.specs && typeof row.specs === "object" && !Array.isArray(row.specs)
        ? (row.specs as Record<string, string>)
        : {},
    variants: Array.isArray(row.variants) ? (row.variants as unknown as ProductVariantGroup[]) : [],
  };
}

/** Live products only — what customers see. */
export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normalize);
}

/** Every product including drafts and archived; the database only returns those to admins. */
async function fetchAllProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normalize);
}

export async function fetchProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data ? normalize(data) : null;
}

export const productsQueryOptions = {
  queryKey: ["products"],
  queryFn: fetchProducts,
  staleTime: 60_000,
};

/**
 * Wishlist, compare and recently-viewed keep copies of products in the browser.
 * This swaps each copy for the current live product (fresh price and stock) and
 * drops products that are no longer live (draft, archived or deleted).
 */
export function useLiveVersions<T extends { id: string }>(items: T[]): (Product & T)[] {
  const { data: live } = useQuery(productsQueryOptions);
  if (!live) return items as (Product & T)[];
  const byId = new Map(live.map((p) => [p.id, p]));
  return items.flatMap((item) => {
    const current = byId.get(item.id);
    return current ? [{ ...item, ...current }] : [];
  });
}

// Under "products" so every products invalidation refreshes the admin list too.
export const adminProductsQueryOptions = {
  queryKey: ["products", "admin"],
  queryFn: fetchAllProducts,
};
