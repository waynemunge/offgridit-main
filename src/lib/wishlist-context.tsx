import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import type { Product } from "./types";

interface WishlistCtx {
  items: Product[];
  count: number;
  toggle: (product: Product) => void;
  isWished: (productId: string) => boolean;
}

const WishlistContext = createContext<WishlistCtx | undefined>(undefined);
const STORAGE_KEY = "offgridit_wishlist";

function loadLocal(): Product[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    setItems(loadLocal());
  }, []);

  const toggle = useCallback((product: Product) => {
    setItems((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      const next = exists
        ? prev.filter((p) => p.id !== product.id)
        : [...prev, product];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      if (exists) {
        toast("Removed from wishlist");
      } else {
        toast.success("Added to wishlist");
      }
      return next;
    });
  }, []);

  const isWished = useCallback(
    (productId: string) => items.some((p) => p.id === productId),
    [items],
  );

  return (
    <WishlistContext.Provider value={{ items, count: items.length, toggle, isWished }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used inside WishlistProvider");
  return ctx;
}
