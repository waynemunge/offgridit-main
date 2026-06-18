import { supabase } from "@/integrations/supabase/client";
import type { Product } from "./types";

function normalize(row: any): Product {
  return {
    ...row,
    price_kes: Number(row.price_kes),
    compare_at_price_kes: row.compare_at_price_kes != null ? Number(row.compare_at_price_kes) : null,
    rating: Number(row.rating),
    images: Array.isArray(row.images) ? row.images : [],
    specs: row.specs && typeof row.specs === "object" ? row.specs : {},
    variants: Array.isArray(row.variants) ? row.variants : [],
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
