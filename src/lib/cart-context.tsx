import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth-context";
import { productsQueryOptions } from "./products";
import type { CartLine, Product } from "./types";

export type LineStatus = "ok" | "sold-out" | "unavailable";

export interface CartViewLine extends CartLine {
  /** Most the customer can have of this product right now. */
  maxQty: number;
  status: LineStatus;
}

interface CartCtx {
  lines: CartViewLine[];
  count: number;
  subtotal: number;
  /** True when a line is sold out or no longer sold — checkout must wait until it's removed. */
  hasUnavailable: boolean;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  addItem: (product: Product, quantity?: number, variant?: string) => void;
  updateQty: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartCtx | undefined>(undefined);
const STORAGE_KEY = "offgridit_cart";

function loadLocal(): CartLine[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartLine[]) : [];
  } catch {
    return [];
  }
}

function saveLocal(lines: CartLine[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    /* ignore */
  }
}

interface CartItemRow {
  quantity: number;
  product:
    | (Omit<Product, "price_kes" | "compare_at_price_kes" | "rating"> & {
        price_kes: number | string;
        compare_at_price_kes: number | string | null;
        rating: number | string;
      })
    | null;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [stored, setStored] = useState<CartLine[]>([]);
  const [isOpen, setOpen] = useState(false);
  const mergedFor = useRef<string | null>(null);
  // Live catalogue: the cart shows current prices and stock, not what they were
  // when the item was added. Most pages already load this query.
  const { data: catalogue } = useQuery(productsQueryOptions);

  // initial local load
  useEffect(() => {
    setStored(loadLocal());
  }, []);

  // Sync with backend when user signs in / out
  useEffect(() => {
    if (!user) {
      mergedFor.current = null;
      return;
    }
    if (mergedFor.current === user.id) return;
    mergedFor.current = user.id;

    (async () => {
      const local = loadLocal();
      const { data, error } = await supabase
        .from("cart_items")
        .select("quantity, product:products(*)")
        .eq("user_id", user.id);
      if (error) return;

      const dbLines: CartLine[] = ((data ?? []) as unknown as CartItemRow[])
        .filter((r) => r.product)
        .map((r) => {
          const p = r.product!;
          return {
            quantity: r.quantity,
            product: {
              ...p,
              price_kes: Number(p.price_kes),
              compare_at_price_kes:
                p.compare_at_price_kes != null ? Number(p.compare_at_price_kes) : null,
              rating: Number(p.rating),
              images: Array.isArray(p.images) ? p.images : [],
              specs: p.specs ?? {},
              variants: Array.isArray(p.variants) ? p.variants : [],
            },
          };
        });

      // merge local into db (local quantities win on overlap)
      const map = new Map<string, CartLine>();
      for (const line of dbLines) map.set(line.product.id, line);
      for (const line of local) {
        const existing = map.get(line.product.id);
        if (existing) existing.quantity = Math.max(existing.quantity, line.quantity);
        else map.set(line.product.id, line);
      }
      const merged = Array.from(map.values());
      setStored(merged);
      saveLocal(merged);

      // persist merged set
      if (merged.length) {
        await supabase.from("cart_items").upsert(
          merged.map((l) => ({
            user_id: user.id,
            product_id: l.product.id,
            quantity: l.quantity,
          })),
          { onConflict: "user_id,product_id" },
        );
      }
    })();
  }, [user]);

  const dbUpsert = useCallback(
    async (productId: string, quantity: number) => {
      if (!user) return;
      await supabase
        .from("cart_items")
        .upsert(
          { user_id: user.id, product_id: productId, quantity },
          { onConflict: "user_id,product_id" },
        );
    },
    [user],
  );

  const dbRemove = useCallback(
    async (productId: string) => {
      if (!user) return;
      await supabase.from("cart_items").delete().eq("user_id", user.id).eq("product_id", productId);
    },
    [user],
  );

  const liveProduct = useCallback((id: string) => catalogue?.find((p) => p.id === id), [catalogue]);

  // Stored lines joined with live product data.
  const lines = useMemo<CartViewLine[]>(
    () =>
      stored.map((line) => {
        if (!catalogue) return { ...line, maxQty: line.product.stock, status: "ok" as const };
        const product = liveProduct(line.product.id);
        if (!product) return { ...line, maxQty: 0, status: "unavailable" as const };
        return {
          ...line,
          product,
          maxQty: product.stock,
          status: product.stock > 0 ? ("ok" as const) : ("sold-out" as const),
        };
      }),
    [stored, catalogue, liveProduct],
  );

  // When stock drops below what's in a cart, bring the quantity down to what's left.
  useEffect(() => {
    if (!catalogue) return;
    const reduced: { name: string; qty: number }[] = [];
    const next = stored.map((line) => {
      const stock = liveProduct(line.product.id)?.stock ?? 0;
      if (stock > 0 && line.quantity > stock) {
        reduced.push({ name: line.product.name, qty: stock });
        dbUpsert(line.product.id, stock);
        return { ...line, quantity: stock };
      }
      return line;
    });
    if (!reduced.length) return;
    setStored(next);
    saveLocal(next);
    for (const r of reduced) {
      toast.info(`Only ${r.qty} of ${r.name} left — we've updated your cart.`);
    }
  }, [catalogue, stored, liveProduct, dbUpsert]);

  const addItem = useCallback(
    (product: Product, quantity = 1, variant?: string) => {
      const stock = liveProduct(product.id)?.stock ?? product.stock;
      if (stock <= 0) {
        toast.error(`${product.name} is sold out.`);
        return;
      }
      const inCart = stored.find((l) => l.product.id === product.id)?.quantity ?? 0;
      if (inCart >= stock) {
        toast.info(`You already have all ${stock} of ${product.name} in your cart.`);
        setOpen(true);
        return;
      }
      const nextQty = Math.min(inCart + quantity, stock);
      const next = inCart
        ? stored.map((l) =>
            l.product.id === product.id
              ? { ...l, product, quantity: nextQty, variant: variant ?? l.variant }
              : l,
          )
        : [...stored, { product, quantity: nextQty, variant }];
      setStored(next);
      saveLocal(next);
      dbUpsert(product.id, nextQty);
      if (nextQty < inCart + quantity) {
        toast.info(`Only ${stock} of ${product.name} available — added ${nextQty - inCart}.`);
      } else {
        toast.success(`${product.name} added to cart`);
      }
      setOpen(true);
    },
    [stored, liveProduct, dbUpsert],
  );

  const updateQty = useCallback(
    (productId: string, quantity: number) => {
      if (quantity < 1) return;
      const line = stored.find((l) => l.product.id === productId);
      if (!line) return;
      const stock = liveProduct(productId)?.stock ?? line.product.stock;
      const qty = Math.min(quantity, Math.max(stock, 1));
      if (quantity > qty) toast.info(`Only ${stock} of ${line.product.name} available.`);
      if (qty === line.quantity) return;
      const next = stored.map((l) => (l.product.id === productId ? { ...l, quantity: qty } : l));
      setStored(next);
      saveLocal(next);
      dbUpsert(productId, qty);
    },
    [stored, liveProduct, dbUpsert],
  );

  const removeItem = useCallback(
    (productId: string) => {
      setStored((prev) => {
        const next = prev.filter((l) => l.product.id !== productId);
        saveLocal(next);
        return next;
      });
      dbRemove(productId);
    },
    [dbRemove],
  );

  const clearCart = useCallback(() => {
    setStored([]);
    saveLocal([]);
    // Supabase queries only run once awaited/then'd — without this the saved cart
    // was never cleared and came back on the next sign-in.
    if (user) void supabase.from("cart_items").delete().eq("user_id", user.id).then();
  }, [user]);

  const available = lines.filter((l) => l.status === "ok");
  const count = lines.reduce((sum, l) => sum + l.quantity, 0);
  const subtotal = available.reduce((sum, l) => sum + l.product.price_kes * l.quantity, 0);
  const hasUnavailable = available.length !== lines.length;

  return (
    <CartContext.Provider
      value={{
        lines,
        count,
        subtotal,
        hasUnavailable,
        isOpen,
        setOpen,
        addItem,
        updateQty,
        removeItem,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
