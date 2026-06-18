import { createFileRoute, Link } from "@tanstack/react-router";
import { GitCompare } from "lucide-react";
import { useCompare } from "@/lib/compare-context";
import { formatKES } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/compare")({
  head: () => ({ meta: [{ title: "Compare Products — OffGridIt" }] }),
  component: ComparePage,
});

function ComparePage() {
  const { items, clear } = useCompare();

  if (items.length < 2) {
    return (
      <div className="container-px mx-auto max-w-4xl py-24 text-center">
        <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
          <GitCompare className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold">Compare products</h1>
        <p className="mt-3 text-muted-foreground">
          Add at least 2 products to compare. Use the "Compare" button on any product card.
        </p>
        <Button variant="hero" size="lg" className="mt-8" asChild>
          <Link to="/shop">Browse products</Link>
        </Button>
      </div>
    );
  }

  const specKeys = Array.from(
    new Set(items.flatMap((p) => Object.keys(p.specs)))
  );

  const rows: { label: string; values: string[] }[] = [
    { label: "Brand", values: items.map((p) => p.brand) },
    { label: "Category", values: items.map((p) => p.category) },
    { label: "Price", values: items.map((p) => formatKES(p.price_kes)) },
    {
      label: "Stock",
      values: items.map((p) => (p.stock === 0 ? "Out of stock" : `${p.stock} units`)),
    },
    {
      label: "Rating",
      values: items.map((p) => (p.rating > 0 ? `${p.rating.toFixed(1)} / 5` : "No reviews yet")),
    },
    ...specKeys.map((k) => ({
      label: k,
      values: items.map((p) => (p.specs as Record<string, string>)[k] ?? "—"),
    })),
  ];

  return (
    <div className="container-px mx-auto max-w-6xl py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Comparing {items.length} products</h1>
        <Button variant="outline" onClick={clear}>
          Clear all
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-card/50">
              <th className="w-40 px-4 py-4 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Feature
              </th>
              {items.map((p) => (
                <th key={p.id} className="min-w-52 px-4 py-4 text-left">
                  <Link
                    to="/product/$slug"
                    params={{ slug: p.slug }}
                    className="group block"
                  >
                    <img
                      src={p.images[0] ?? "/images/products/phone-aurora.jpg"}
                      alt={p.name}
                      className="mb-3 h-28 w-28 rounded-xl border border-border object-cover transition-colors group-hover:border-primary/50"
                    />
                    <p className="font-semibold leading-tight group-hover:text-primary">
                      {p.name}
                    </p>
                    <p className="mt-1 text-lg font-bold text-primary">
                      {formatKES(p.price_kes)}
                    </p>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.label} className={i % 2 === 0 ? "" : "bg-card/30"}>
                <td className="px-4 py-3 font-medium text-muted-foreground">{row.label}</td>
                {row.values.map((val, j) => (
                  <td key={j} className="px-4 py-3">
                    {val}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
