/** draft: being set up · active: Live in the store · archived: no longer sold. */
export type ProductStatus = "draft" | "active" | "archived";

export const PRODUCT_STATUSES: { value: ProductStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Live" },
  { value: "archived", label: "Archived" },
];

export interface ProductVariantGroup {
  name: string;
  options: string[];
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  brand: string;
  category: string;
  description: string | null;
  price_kes: number;
  compare_at_price_kes: number | null;
  images: string[];
  specs: Record<string, string>;
  variants: ProductVariantGroup[];
  stock: number;
  rating: number;
  is_featured: boolean;
  is_on_sale: boolean;
  sale_ends_at?: string | null;
  status: ProductStatus;
  created_at: string;
}

export const CATEGORIES = [
  "Phones",
  "Laptops",
  "Tablets",
  "Audio",
  "Wearables",
  "Accessories",
] as const;

export interface CartLine {
  product: Product;
  quantity: number;
  variant?: string;
}
