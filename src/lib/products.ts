import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import type { Product, ProductVariantGroup } from "./types";

// numeric columns arrive as strings; JSON columns need a shape check.
function normalize(row: Tables<"products">): Product {
  return {
    ...row,
    price_kes: Number(row.price_kes),
    compare_at_price_kes:
      row.compare_at_price_kes != null ? Number(row.compare_at_price_kes) : null,
    rating: Number(row.rating),
    images: Array.isArray(row.images) ? (row.images as string[]) : [],
    specs:
      row.specs && typeof row.specs === "object" && !Array.isArray(row.specs)
        ? (row.specs as Record<string, string>)
        : {},
    variants: Array.isArray(row.variants) ? (row.variants as unknown as ProductVariantGroup[]) : [],
  };
}

export async function fetchProducts(): Promise<Product[]> {
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
