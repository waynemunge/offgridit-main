import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Package, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useAuthModal } from "@/lib/auth-modal";
import { formatKES } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "My Orders — OffGridIt" }] }),
  component: OrdersPage,
});

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-500",
  paid: "bg-blue-500/15 text-blue-500",
  processing: "bg-purple-500/15 text-purple-500",
  shipped: "bg-cyan-500/15 text-cyan-500",
  delivered: "bg-success/15 text-success",
  cancelled: "bg-destructive/15 text-destructive",
};

type OrderItem = {
  id: string;
  product_name: string;
  product_brand: string;
  product_image: string | null;
  quantity: number;
  unit_price_kes: number;
  total_price_kes: number;
};

type Order = {
  id: string;
  status: string;
  payment_method: string;
  full_name: string;
  address: string;
  city: string;
  subtotal_kes: number;
  delivery_fee_kes: number;
  total_kes: number;
  created_at: string;
  order_items: OrderItem[];
};

function OrdersPage() {
  const { user, loading } = useAuth();
  const { openAuth } = useAuthModal();

  if (loading) {
    return (
      <div className="container-px mx-auto max-w-3xl py-12 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container-px mx-auto max-w-xl py-24 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
          <ShoppingBag className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-3xl font-bold">Your orders</h1>
        <p className="mt-3 text-muted-foreground">Sign in to view your order history.</p>
        <Button variant="hero" size="lg" className="mt-8" onClick={openAuth}>
          Sign in
        </Button>
      </div>
    );
  }

  return <OrdersList userId={user.id} />;
}

function OrdersList({ userId }: { userId: string }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["customer-orders", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Order[];
    },
  });

  if (isLoading) {
    return (
      <div className="container-px mx-auto max-w-3xl py-12 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="container-px mx-auto max-w-xl py-24 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-secondary text-muted-foreground">
          <Package className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-3xl font-bold">No orders yet</h1>
        <p className="mt-3 text-muted-foreground">Your order history will appear here once you make a purchase.</p>
        <Button variant="hero" size="lg" className="mt-8" asChild>
          <Link to="/shop">Browse products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container-px mx-auto max-w-3xl py-10">
      <h1 className="mb-8 text-3xl font-bold">My orders</h1>
      <div className="space-y-4">
        {orders.map((order) => {
          const isOpen = expanded === order.id;
          return (
            <div key={order.id} className="overflow-hidden rounded-2xl border border-border bg-card">
              {/* Order header */}
              <button
                className="flex w-full items-center gap-4 p-5 text-left"
                onClick={() => setExpanded(isOpen ? null : order.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-sm font-semibold">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[order.status] ?? ""}`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString("en-KE", {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                    {" · "}
                    {order.order_items.length} item{order.order_items.length !== 1 ? "s" : ""}
                    {" · "}
                    <span className="capitalize">{order.payment_method}</span>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold">{formatKES(Number(order.total_kes))}</p>
                </div>
                {isOpen
                  ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                  : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />}
              </button>

              {/* Expanded items */}
              {isOpen && (
                <div className="border-t border-border px-5 pb-5 pt-4">
                  <div className="space-y-3">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        {item.product_image && (
                          <img
                            src={item.product_image}
                            alt=""
                            className="h-12 w-12 shrink-0 rounded-xl border border-border object-cover"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-medium">{item.product_name}</p>
                          <p className="text-xs text-muted-foreground">{item.product_brand} · Qty {item.quantity}</p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold">
                          {formatKES(Number(item.total_price_kes))}
                        </span>
                      </div>
                    ))}
                  </div>

                  <dl className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <dt>Subtotal</dt><dd>{formatKES(Number(order.subtotal_kes))}</dd>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <dt>Delivery</dt><dd>{formatKES(Number(order.delivery_fee_kes))}</dd>
                    </div>
                    <div className="flex justify-between font-bold pt-1 text-base">
                      <dt>Total</dt><dd>{formatKES(Number(order.total_kes))}</dd>
                    </div>
                  </dl>

                  <p className="mt-3 text-xs text-muted-foreground">
                    Delivering to {order.address}, {order.city}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
