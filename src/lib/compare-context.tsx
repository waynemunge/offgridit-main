import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { Product } from "./types";

const MAX = 3;
const KEY = "offgridit_compare";

interface CompareCtx {
  items: Product[];
  toggle: (product: Product) => void;
  isInComparison: (id: string) => boolean;
  clear: () => void;
}

const CompareContext = createContext<CompareCtx | undefined>(undefined);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Product[]>(() => {
    if (typeof localStorage === "undefined") return [];
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const toggle = useCallback((product: Product) => {
    setItems((prev) => {
      const exists = prev.some((p) => p.id === product.id);
      let next: Product[];
      if (exists) {
        next = prev.filter((p) => p.id !== product.id);
      } else if (prev.length >= MAX) {
        next = [...prev.slice(1), product];
      } else {
        next = [...prev, product];
      }
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const isInComparison = useCallback((id: string) => items.some((p) => p.id === id), [items]);

  const clear = useCallback(() => {
    setItems([]);
    try { localStorage.removeItem(KEY); } catch {}
  }, []);

  return (
    <CompareContext.Provider value={{ items, toggle, isInComparison, clear }}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used within CompareProvider");
  return ctx;
}
