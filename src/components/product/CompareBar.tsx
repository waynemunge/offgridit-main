import { Link } from "@tanstack/react-router";
import { GitCompare, X } from "lucide-react";
import { useCompare } from "@/lib/compare-context";
import { Button } from "@/components/ui/button";

export function CompareBar() {
  const { items, toggle, clear } = useCompare();
  if (items.length < 1) return null;

  return (
    <div className="fixed bottom-24 left-2 right-2 z-40 sm:left-1/2 sm:right-auto sm:-translate-x-1/2">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card/95 px-3 py-2 shadow-2xl backdrop-blur-sm sm:gap-3 sm:px-4 sm:py-3">
        {items.map((p) => (
          <div key={p.id} className="relative">
            <img
              src={p.images[0] ?? "/images/products/phone-aurora.jpg"}
              alt={p.name}
              className="h-12 w-12 rounded-lg border border-border object-cover"
            />
            <button
              onClick={() => toggle(p)}
              aria-label="Remove from comparison"
              className="absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full bg-destructive text-destructive-foreground"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        ))}
        {Array.from({ length: Math.max(0, 2 - items.length) }).map((_, i) => (
          <div
            key={i}
            className="grid h-12 w-12 place-items-center rounded-lg border border-dashed border-border bg-secondary/40 text-lg text-muted-foreground"
          >
            +
          </div>
        ))}
        <div className="ml-2 flex items-center gap-2">
          {items.length >= 2 ? (
            <Button variant="hero" size="sm" asChild>
              <Link to="/compare">
                <GitCompare className="h-4 w-4" /> Compare {items.length}
              </Link>
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">
              Add {2 - items.length} more to compare
            </span>
          )}
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={clear}>
            Clear
          </Button>
        </div>
      </div>
    </div>
  );
}
