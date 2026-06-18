import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth-context";
import type { CartLine, Product } from "./types";

interface CartCtx {
  lines: CartLine[];
  count: number;
  subtotal: number;
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

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [isOpen, setOpen] = useState(false);
  const mergedFor = useRef<string | null>(null);

  // initial local load
  useEffect(() => {
    setLines(loadLocal());
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

      const dbLines: CartLine[] = (data ?? [])
        .filter((r: any) => r.product)
        .map((r: any) => ({
          quantity: r.quantity,
          product: {
            ...r.product,
            price_kes: Number(r.product.price_kes),
            compare_at_price_kes:
              r.product.compare_at_price_kes != null ? Number(r.product.compare_at_price_kes) : null,
            rating: Number(r.product.rating),
            images: Array.isArray(r.product.images) ? r.product.images : [],
            specs: r.product.specs ?? {},
          },
        }));

      // merge local into db (local quantities win on overlap)
      const map = new Map<string, CartLine>();
      for (const line of dbLines) map.set(line.product.id, line);
      for (const line of local) {
        const existing = map.get(line.product.id);
        if (existing) existing.quantity = Math.max(existing.quantity, line.quantity);
        else map.set(line.product.id, line);
      }
      const merged = Array.from(map.values());
      setLines(merged);
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

  const persist = useCallback(
    (next: CartLine[]) => {
      setLines(next);
      saveLocal(next);
    },
    [],
  );

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

  const addItem = useCallback(
    (product: Product, quantity = 1, variant?: string) => {
      setLines((prev) => {
        const existing = prev.find((l) => l.product.id === product.id);
        const nextQty = Math.min((existing?.quantity ?? 0) + quantity, Math.max(product.stock, 1));
        const next = existing
          ? prev.map((l) => (l.product.id === product.id ? { ...l, quantity: nextQty, variant: variant ?? l.variant } : l))
          : [...prev, { product, quantity: nextQty, variant }];
        saveLocal(next);
        dbUpsert(product.id, nextQty);
        return next;
      });
      toast.success(`${product.name} added to cart`);
      setOpen(true);
    },
    [dbUpsert],
  );

  const updateQty = useCallback(
    (productId: string, quantity: number) => {
      if (quantity < 1) return;
      setLines((prev) => {
        const next = prev.map((l) =>
          l.product.id === productId
            ? { ...l, quantity: Math.min(quantity, Math.max(l.product.stock, 1)) }
            : l,
        );
        saveLocal(next);
        const line = next.find((l) => l.product.id === productId);
        if (line) dbUpsert(productId, line.quantity);
        return next;
      });
    },
    [dbUpsert],
  );

  const removeItem = useCallback(
    (productId: string) => {
      setLines((prev) => {
        const next = prev.filter((l) => l.product.id !== productId);
        saveLocal(next);
        return next;
      });
      dbRemove(productId);
    },
    [dbRemove],
  );

  const clearCart = useCallback(() => {
    persist([]);
    if (user) supabase.from("cart_items").delete().eq("user_id", user.id);
  }, [persist, user]);

  const count = lines.reduce((sum, l) => sum + l.quantity, 0);
  const subtotal = lines.reduce((sum, l) => sum + l.product.price_kes * l.quantity, 0);

  return (
    <CartContext.Provider
      value={{ lines, count, subtotal, isOpen, setOpen, addItem, updateQty, removeItem, clearCart }}
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
