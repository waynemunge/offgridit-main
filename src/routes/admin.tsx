import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit,
  LayoutDashboard,
  Loader2,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Star,
  Tag,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { CATEGORIES } from "@/lib/types";
import { formatKES } from "@/lib/format";
import { productsQueryOptions } from "@/lib/products";
import {
  adminBulkUpdateStock,
  adminDeleteProduct,
  adminGetCustomers,
  adminSaveProduct,
  adminUpdateOrderNotes,
  adminUpdateOrderStatus,
} from "@/lib/api/admin.functions";
import {
  adminCreateDiscountCode,
  adminDeleteDiscountCode,
  adminGetDiscountCodes,
  adminToggleDiscountCode,
} from "@/lib/api/discount.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — OffGridIt" }] }),
  component: AdminGate,
});

// ── Types ────────────────────────────────────────────────────────────────────

type Order = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  delivery_notes: string | null;
  admin_notes?: string | null;
  payment_method: string;
  status: string;
  subtotal_kes: number;
  delivery_fee_kes: number;
  total_kes: number;
  created_at: string;
  order_items: OrderItem[];
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

type ProductForm = {
  id?: string;
  name: string;
  slug: string;
  brand: string;
  category: string;
  description: string;
  price_kes: string;
  compare_at_price_kes: string;
  images: string[];
  stock: string;
  is_featured: boolean;
  is_on_sale: boolean;
  sale_ends_at: string;
  specs_raw: string;
};

const EMPTY_FORM: ProductForm = {
  name: "",
  slug: "",
  brand: "",
  category: "Phones",
  description: "",
  price_kes: "",
  compare_at_price_kes: "",
  images: [],
  stock: "0",
  is_featured: false,
  is_on_sale: false,
  sale_ends_at: "",
  specs_raw: "",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/15 text-yellow-500",
  paid: "bg-blue-500/15 text-blue-500",
  processing: "bg-purple-500/15 text-purple-500",
  shipped: "bg-cyan-500/15 text-cyan-500",
  delivered: "bg-success/15 text-success",
  cancelled: "bg-destructive/15 text-destructive",
};

const ORDER_STATUSES = ["pending", "paid", "processing", "shipped", "delivered", "cancelled"];

// ── Access gate ──────────────────────────────────────────────────────────────

function AdminGate() {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) { setIsAdmin(false); return; }
    supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single()
      .then(({ data }) => setIsAdmin(data?.is_admin ?? false));
  }, [user, loading]);

  if (loading || isAdmin === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="container-px mx-auto max-w-xl py-24 text-center">
        <h1 className="text-3xl font-bold">Access denied</h1>
        <p className="mt-3 text-muted-foreground">You don't have permission to view this page.</p>
        <Button variant="hero" className="mt-6" asChild>
          <Link to="/">Go home</Link>
        </Button>
      </div>
    );
  }

  return <AdminDashboard />;
}

// ── Dashboard ────────────────────────────────────────────────────────────────

function AdminDashboard() {
  const [tab, setTab] = useState<"overview" | "orders" | "customers" | "products" | "codes">("overview");

  return (
    <div className="container-px mx-auto max-w-7xl py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage orders and products</p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link to="/"><ArrowLeft className="h-4 w-4" /> Back to store</Link>
        </Button>
      </div>

      <div className="mb-6 flex gap-2 border-b border-border">
        {([
          { key: "overview", label: "Overview", icon: LayoutDashboard },
          { key: "orders", label: "Orders", icon: ShoppingBag },
          { key: "customers", label: "Customers", icon: Users },
          { key: "products", label: "Products", icon: Package },
          { key: "codes", label: "Discount codes", icon: Tag },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 border-b-2 px-4 pb-3 text-sm font-medium transition-colors ${
              tab === key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === "overview" && <OverviewPanel />}
      {tab === "orders" && <OrdersPanel />}
      {tab === "customers" && <CustomersPanel />}
      {tab === "products" && <ProductsPanel />}
      {tab === "codes" && <CodesPanel />}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Overview panel ───────────────────────────────────────────────────────────

function OverviewPanel() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["admin-overview-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, total_kes, status, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: topProducts = [] } = useQuery({
    queryKey: ["admin-top-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("product_name, product_brand, quantity");
      if (error) throw error;
      const map: Record<string, { name: string; brand: string; units: number }> = {};
      (data ?? []).forEach((item) => {
        if (!map[item.product_name]) {
          map[item.product_name] = { name: item.product_name, brand: item.product_brand, units: 0 };
        }
        map[item.product_name].units += item.quantity;
      });
      return Object.values(map).sort((a, b) => b.units - a.units).slice(0, 5);
    },
  });

  const now = new Date();
  const active = orders.filter((o) => o.status !== "cancelled");
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay());
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const sum = (list: typeof active) => list.reduce((s, o) => s + Number(o.total_kes), 0);
  const inPeriod = (from: Date) => active.filter((o) => new Date(o.created_at) >= from);

  const totalRevenue = sum(active);
  const monthRevenue = sum(inPeriod(startOfMonth));
  const weekRevenue = sum(inPeriod(startOfWeek));
  const todayRevenue = sum(inPeriod(startOfDay));
  const avgOrder = active.length ? totalRevenue / active.length : 0;
  const pending = orders.filter((o) => o.status === "pending").length;

  const kpis = [
    { label: "All-time revenue", value: formatKES(totalRevenue), sub: `${active.length} paid orders` },
    { label: "This month", value: formatKES(monthRevenue), sub: "revenue" },
    { label: "This week", value: formatKES(weekRevenue), sub: "revenue" },
    { label: "Today", value: formatKES(todayRevenue), sub: "revenue" },
    { label: "Avg order value", value: formatKES(avgOrder), sub: "per order" },
    { label: "Pending payment", value: String(pending), sub: pending ? "need attention" : "all clear" },
  ];

  const monthlyChart = Array.from({ length: 6 }, (_, i) => {
    const start = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const end = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 1);
    const label = start.toLocaleString("en-KE", { month: "short" });
    const revenue = active
      .filter((o) => { const t = new Date(o.created_at); return t >= start && t < end; })
      .reduce((s, o) => s + Number(o.total_kes), 0);
    return { month: label, revenue };
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-card p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{k.label}</p>
            <p className="mt-2 text-2xl font-bold">{k.value}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{k.sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Revenue — last 6 months</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyChart} barSize={36}>
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
            <YAxis
              axisLine={false}
              tickLine={false}
              width={48}
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
            />
            <Tooltip
              formatter={(v: number) => [formatKES(v), "Revenue"]}
              contentStyle={{
                borderRadius: "0.75rem",
                border: "1px solid var(--color-border)",
                background: "var(--color-card)",
                color: "var(--color-foreground)",
                fontSize: 13,
              }}
              cursor={{ fill: "var(--color-secondary)", opacity: 0.5 }}
            />
            <Bar dataKey="revenue" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {topProducts.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Top products by units sold</h2>
          <div className="space-y-3">
            {topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3 text-sm">
                <span className="w-6 text-center text-xs font-bold text-muted-foreground">#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.brand}</p>
                </div>
                <span className="shrink-0 font-semibold">{p.units} sold</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Downloads */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Download reports</h2>
        <p className="mb-4 text-xs text-muted-foreground">Export data as CSV — opens in Excel, Google Sheets, etc.</p>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const { data } = await supabase
                .from("orders")
                .select("id, created_at, full_name, email, phone, city, payment_method, status, subtotal_kes, delivery_fee_kes, total_kes")
                .order("created_at", { ascending: false });
              if (!data) return;
              downloadCSV(`offgridit-orders-${new Date().toISOString().slice(0, 10)}.csv`, [
                ["Order ID", "Date", "Customer", "Email", "Phone", "City", "Payment", "Status", "Subtotal (KES)", "Shipping (KES)", "Total (KES)"],
                ...data.map((o) => [
                  o.id,
                  new Date(o.created_at).toLocaleDateString("en-KE"),
                  o.full_name,
                  o.email,
                  o.phone,
                  o.city,
                  o.payment_method,
                  o.status,
                  o.subtotal_kes,
                  o.delivery_fee_kes,
                  o.total_kes,
                ]),
              ]);
            }}
          >
            <Download className="h-4 w-4" /> Orders
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadCSV(`offgridit-revenue-${new Date().toISOString().slice(0, 10)}.csv`, [
                ["Month", "Revenue (KES)"],
                ...monthlyChart.map((r) => [r.month, r.revenue]),
              ])
            }
          >
            <Download className="h-4 w-4" /> Monthly revenue
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              downloadCSV(`offgridit-top-products-${new Date().toISOString().slice(0, 10)}.csv`, [
                ["Rank", "Product", "Brand", "Units sold"],
                ...topProducts.map((p, i) => [i + 1, p.name, p.brand, p.units]),
              ])
            }
          >
            <Download className="h-4 w-4" /> Top products
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Customers panel ───────────────────────────────────────────────────────────

function CustomersPanel() {
  const [search, setSearch] = useState("");

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["admin-customers"],
    queryFn: () => adminGetCustomers({ data: undefined }),
  });

  const q = search.trim().toLowerCase();
  const filtered = customers.filter(
    (c) =>
      !q ||
      c.email.toLowerCase().includes(q) ||
      (c.full_name ?? "").toLowerCase().includes(q),
  );

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{customers.length} registered customers</p>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Total spent</TableHead>
                <TableHead>Last order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.email}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{c.full_name}</p>
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.phone}</TableCell>
                  <TableCell>
                    <span className="font-medium">{c.order_count}</span>
                  </TableCell>
                  <TableCell className="font-semibold">
                    {formatKES(c.total_spend)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(c.last_order_at).toLocaleDateString("en-KE")}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No customers found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ── Orders panel ─────────────────────────────────────────────────────────────

function OrdersPanel() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savingNotes, setSavingNotes] = useState<string | null>(null);

  const saveNotes = async (orderId: string) => {
    setSavingNotes(orderId);
    try {
      await adminUpdateOrderNotes({ data: { orderId, notes: notes[orderId] ?? "" } });
      toast.success("Notes saved");
    } catch {
      toast.error("Failed to save notes");
    } finally {
      setSavingNotes(null);
    }
  };

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("*, order_items(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Order[];
    },
  });

  const q = search.trim().toLowerCase();
  const filtered = orders.filter((o) => {
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    const matchesSearch =
      !q ||
      o.full_name.toLowerCase().includes(q) ||
      o.email.toLowerCase().includes(q) ||
      o.phone.toLowerCase().includes(q) ||
      o.id.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    revenue: orders
      .filter((o) => !["cancelled", "pending"].includes(o.status))
      .reduce((s, o) => s + Number(o.total_kes), 0),
  };

  const updateStatus = async (orderId: string, status: string) => {
    setUpdating(orderId);
    try {
      await adminUpdateOrderStatus({ data: { orderId, status: status as any } });
      await refetch();
      toast.success("Order status updated");
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div>
      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-4">
        {[
          { label: "Total orders", value: stats.total },
          { label: "Pending", value: stats.pending },
          { label: "Revenue", value: formatKES(stats.revenue) },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="mb-3 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name, email, phone or order ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Status filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        {["all", ...ORDER_STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
              statusFilter === s
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-16 text-center text-muted-foreground">
          No orders found.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((order) => (
                <>
                  <TableRow
                    key={order.id}
                    className="cursor-pointer"
                    onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      #{order.id.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{order.full_name}</div>
                      <div className="text-xs text-muted-foreground">{order.email}</div>
                    </TableCell>
                    <TableCell className="text-sm">{order.phone}</TableCell>
                    <TableCell>
                      <span className="capitalize">{order.payment_method}</span>
                    </TableCell>
                    <TableCell className="font-semibold">{formatKES(Number(order.total_kes))}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={order.status}
                        onValueChange={(v) => updateStatus(order.id, v)}
                        disabled={updating === order.id}
                      >
                        <SelectTrigger className="h-7 w-32 text-xs">
                          <span className={`mr-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[order.status] ?? ""}`}>
                            {order.status}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {ORDER_STATUSES.map((s) => (
                            <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("en-KE")}
                    </TableCell>
                  </TableRow>
                  {expanded === order.id && (
                    <TableRow key={`${order.id}-items`}>
                      <TableCell colSpan={7} className="bg-secondary/30 p-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Delivery: {order.address}, {order.city}
                          {order.delivery_notes ? ` — ${order.delivery_notes}` : ""}
                        </p>
                        <div className="space-y-2">
                          {order.order_items.map((item) => (
                            <div key={item.id} className="flex items-center gap-3 text-sm">
                              {item.product_image && (
                                <img src={item.product_image} alt="" className="h-10 w-10 rounded-lg object-cover" />
                              )}
                              <span className="flex-1 font-medium">{item.product_name}</span>
                              <span className="text-muted-foreground">×{item.quantity}</span>
                              <span className="font-semibold">{formatKES(Number(item.total_price_kes))}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 border-t border-border pt-4" onClick={(e) => e.stopPropagation()}>
                          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Admin notes</p>
                          <Textarea
                            rows={2}
                            placeholder="Internal note (not visible to customer)…"
                            value={notes[order.id] ?? order.admin_notes ?? ""}
                            onChange={(e) => setNotes((n) => ({ ...n, [order.id]: e.target.value }))}
                            className="text-sm"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2"
                            disabled={savingNotes === order.id}
                            onClick={() => saveNotes(order.id)}
                          >
                            {savingNotes === order.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save note"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ── Products panel ────────────────────────────────────────────────────────────

function ProductsPanel() {
  const qc = useQueryClient();
  const { data: products = [], isLoading } = useQuery(productsQueryOptions);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [addUrl, setAddUrl] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingStock, setEditingStock] = useState(false);
  const [stockEdits, setStockEdits] = useState<Record<string, number>>({});
  const [savingStock, setSavingStock] = useState(false);

  const saveStock = async () => {
    const changes = Object.entries(stockEdits).map(([id, stock]) => ({ id, stock }));
    if (!changes.length) { setEditingStock(false); return; }
    setSavingStock(true);
    try {
      await adminBulkUpdateStock({ data: changes });
      qc.invalidateQueries({ queryKey: ["products"] });
      setEditingStock(false);
      setStockEdits({});
      toast.success(`Updated stock for ${changes.length} product${changes.length > 1 ? "s" : ""}`);
    } catch {
      toast.error("Failed to update stock");
    } finally {
      setSavingStock(false);
    }
  };
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await supabase.storage
        .from("product-images")
        .upload(filename, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(data.path);
      setForm((f) => ({ ...f, images: [...f.images, urlData.publicUrl] }));
      toast.success("Image uploaded");
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const openNew = () => { setForm(EMPTY_FORM); setAddUrl(""); setSheetOpen(true); };
  const openEdit = (p: any) => {
    setAddUrl("");
    setForm({
      id: p.id,
      name: p.name,
      slug: p.slug,
      brand: p.brand,
      category: p.category,
      description: p.description ?? "",
      price_kes: String(p.price_kes),
      compare_at_price_kes: p.compare_at_price_kes ? String(p.compare_at_price_kes) : "",
      stock: String(p.stock),
      is_featured: p.is_featured,
      is_on_sale: p.is_on_sale,
      sale_ends_at: p.sale_ends_at ? new Date(p.sale_ends_at).toISOString().slice(0, 16) : "",
      images: p.images ?? [],
      specs_raw: Object.entries(p.specs as Record<string, string>)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n"),
    });
    setSheetOpen(true);
  };

  const slugify = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const parseSpecs = (raw: string): Record<string, string> => {
    const specs: Record<string, string> = {};
    raw.split("\n").forEach((line) => {
      const idx = line.indexOf(":");
      if (idx === -1) return;
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim();
      if (k && v) specs[k] = v;
    });
    return specs;
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminSaveProduct({
        data: {
          id: form.id,
          name: form.name,
          slug: form.slug || slugify(form.name),
          brand: form.brand,
          category: form.category,
          description: form.description || null,
          price_kes: Number(form.price_kes),
          compare_at_price_kes: form.compare_at_price_kes ? Number(form.compare_at_price_kes) : null,
          images: form.images,
          specs: parseSpecs(form.specs_raw),
          stock: Number(form.stock),
          is_featured: form.is_featured,
          is_on_sale: form.is_on_sale,
          sale_ends_at: form.sale_ends_at ? new Date(form.sale_ends_at).toISOString() : null,
        },
      });
      qc.invalidateQueries({ queryKey: ["products"] });
      setSheetOpen(false);
      toast.success(form.id ? "Product updated" : "Product created");
    } catch (err) {
      toast.error("Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await adminDeleteProduct({ data: { id: deleteId } });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product deleted");
    } catch {
      toast.error("Failed to delete product");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const LOW_STOCK = 5;
  const outOfStock = products.filter((p) => p.stock === 0).length;
  const lowStock = products.filter((p) => p.stock > 0 && p.stock <= LOW_STOCK).length;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{products.length} products</p>
        <div className="flex gap-2">
          {editingStock ? (
            <>
              <Button variant="outline" size="sm" onClick={() => { setEditingStock(false); setStockEdits({}); }}>
                Cancel
              </Button>
              <Button variant="hero" size="sm" onClick={saveStock} disabled={savingStock}>
                {savingStock && <Loader2 className="h-4 w-4 animate-spin" />}
                Save stock
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditingStock(true)}>
                Edit stock
              </Button>
              <Button variant="hero" size="sm" onClick={openNew}>
                <Plus className="h-4 w-4" /> Add product
              </Button>
            </>
          )}
        </div>
      </div>

      {(lowStock > 0 || outOfStock > 0) && (
        <div className="mb-4 flex flex-wrap gap-3">
          {lowStock > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm font-medium text-yellow-500">
              <AlertTriangle className="h-4 w-4" />
              {lowStock} product{lowStock > 1 ? "s" : ""} low on stock (≤{LOW_STOCK})
            </div>
          )}
          {outOfStock > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {outOfStock} product{outOfStock > 1 ? "s" : ""} out of stock
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Featured</TableHead>
                <TableHead>Sale</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img
                        src={p.images[0]}
                        alt=""
                        className="h-10 w-10 rounded-lg object-cover border border-border"
                      />
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.brand}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{p.category}</TableCell>
                  <TableCell className="font-semibold">{formatKES(p.price_kes)}</TableCell>
                  <TableCell>
                    {editingStock ? (
                      <Input
                        type="number"
                        min={0}
                        className="h-8 w-20 text-sm"
                        value={stockEdits[p.id] ?? p.stock}
                        onChange={(e) =>
                          setStockEdits((s) => ({ ...s, [p.id]: Number(e.target.value) }))
                        }
                      />
                    ) : p.stock === 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                        <AlertTriangle className="h-3 w-3" /> Out of stock
                      </span>
                    ) : p.stock <= LOW_STOCK ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-500">
                        <AlertTriangle className="h-3 w-3" /> {p.stock} left
                      </span>
                    ) : (
                      <span>{p.stock}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Star className={`h-4 w-4 ${p.is_featured ? "fill-primary text-primary" : "text-muted-foreground"}`} />
                  </TableCell>
                  <TableCell>
                    <span className={`text-xs font-medium ${p.is_on_sale ? "text-success" : "text-muted-foreground"}`}>
                      {p.is_on_sale ? "Yes" : "No"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteId(p.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add / edit sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader className="mb-6">
            <SheetTitle>{form.id ? "Edit product" : "Add product"}</SheetTitle>
          </SheetHeader>
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      name: e.target.value,
                      slug: f.id ? f.slug : slugify(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Slug</Label>
                <Input
                  required
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Brand</Label>
                <Input
                  required
                  value={form.brand}
                  onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Price (KES)</Label>
                <Input
                  type="number"
                  required
                  min={1}
                  value={form.price_kes}
                  onChange={(e) => setForm((f) => ({ ...f, price_kes: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Compare-at price (optional)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.compare_at_price_kes}
                  onChange={(e) => setForm((f) => ({ ...f, compare_at_price_kes: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Stock</Label>
                <Input
                  type="number"
                  required
                  min={0}
                  value={form.stock}
                  onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Product images</Label>

                {/* Thumbnails */}
                {form.images.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.images.map((img, i) => (
                      <div key={i} className="group relative">
                        <img
                          src={img}
                          alt=""
                          className={`h-20 w-20 rounded-xl border object-cover ${
                            i === 0 ? "border-primary" : "border-border"
                          }`}
                        />
                        {i === 0 && (
                          <span className="absolute bottom-1 left-1 rounded bg-primary px-1 py-0.5 text-[9px] font-bold text-primary-foreground">
                            Main
                          </span>
                        )}
                        <button
                          type="button"
                          aria-label="Remove image"
                          onClick={() =>
                            setForm((f) => ({ ...f, images: f.images.filter((_, j) => j !== i) }))
                          }
                          className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 place-items-center rounded-full bg-destructive text-destructive-foreground group-hover:grid"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <div className="absolute inset-x-0 top-1 hidden justify-center gap-1 group-hover:flex">
                          {i > 0 && (
                            <button
                              type="button"
                              aria-label="Move left"
                              onClick={() =>
                                setForm((f) => {
                                  const imgs = [...f.images];
                                  [imgs[i - 1], imgs[i]] = [imgs[i], imgs[i - 1]];
                                  return { ...f, images: imgs };
                                })
                              }
                              className="grid h-5 w-5 place-items-center rounded bg-background/90 text-foreground shadow"
                            >
                              <ChevronLeft className="h-3 w-3" />
                            </button>
                          )}
                          {i < form.images.length - 1 && (
                            <button
                              type="button"
                              aria-label="Move right"
                              onClick={() =>
                                setForm((f) => {
                                  const imgs = [...f.images];
                                  [imgs[i], imgs[i + 1]] = [imgs[i + 1], imgs[i]];
                                  return { ...f, images: imgs };
                                })
                              }
                              className="grid h-5 w-5 place-items-center rounded bg-background/90 text-foreground shadow"
                            >
                              <ChevronRight className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add image row */}
                <div className="flex gap-2">
                  <Input
                    type="url"
                    placeholder="Paste image URL then Add →"
                    value={addUrl}
                    onChange={(e) => setAddUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (addUrl.trim()) {
                          setForm((f) => ({ ...f, images: [...f.images, addUrl.trim()] }));
                          setAddUrl("");
                        }
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    disabled={!addUrl.trim()}
                    onClick={() => {
                      if (addUrl.trim()) {
                        setForm((f) => ({ ...f, images: [...f.images, addUrl.trim()] }));
                        setAddUrl("");
                      }
                    }}
                  >
                    Add
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Upload
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  First image is the main photo. Hover a thumbnail to reorder or remove.
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Specs (one per line: Key: Value)</Label>
              <Textarea
                rows={5}
                placeholder={"Display: 6.1\" OLED\nRAM: 8GB\nBattery: 3274mAh"}
                value={form.specs_raw}
                onChange={(e) => setForm((f) => ({ ...f, specs_raw: e.target.value }))}
              />
            </div>

            <div className="flex gap-6">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Switch
                  checked={form.is_featured}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_featured: v }))}
                />
                Featured
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Switch
                  checked={form.is_on_sale}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_on_sale: v, sale_ends_at: v ? f.sale_ends_at : "" }))}
                />
                On sale
              </label>
            </div>

            {form.is_on_sale && (
              <div className="space-y-1.5">
                <Label>Flash sale ends at (optional)</Label>
                <Input
                  type="datetime-local"
                  value={form.sale_ends_at}
                  onChange={(e) => setForm((f) => ({ ...f, sale_ends_at: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank for no countdown. Uses your device's local time.
                </p>
              </div>
            )}

            <Button type="submit" variant="hero" className="w-full" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {form.id ? "Save changes" : "Create product"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. The product will be removed from the store immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Discount Codes panel ─────────────────────────────────────────────────────

type DiscountCode = {
  id: string;
  code: string;
  type: "percentage" | "fixed";
  value: number;
  min_order_kes: number;
  max_uses: number | null;
  uses: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
};

const EMPTY_CODE = {
  code: "",
  type: "percentage" as "percentage" | "fixed",
  value: "",
  min_order_kes: "",
  max_uses: "",
  expires_at: "",
};

function CodesPanel() {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY_CODE);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const { data: codes = [], isLoading } = useQuery({
    queryKey: ["admin-discount-codes"],
    queryFn: () => adminGetDiscountCodes({ data: undefined }),
  });

  const createCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await adminCreateDiscountCode({
        data: {
          code: form.code,
          type: form.type,
          value: Number(form.value),
          min_order_kes: form.min_order_kes ? Number(form.min_order_kes) : 0,
          max_uses: form.max_uses ? Number(form.max_uses) : null,
          expires_at: form.expires_at || null,
        },
      });
      qc.invalidateQueries({ queryKey: ["admin-discount-codes"] });
      setForm(EMPTY_CODE);
      setShowForm(false);
      toast.success("Code created");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create code");
    } finally {
      setCreating(false);
    }
  };

  const toggleCode = async (id: string, is_active: boolean) => {
    await adminToggleDiscountCode({ data: { id, is_active } });
    qc.invalidateQueries({ queryKey: ["admin-discount-codes"] });
  };

  const deleteCode = async (id: string) => {
    await adminDeleteDiscountCode({ data: { id } });
    qc.invalidateQueries({ queryKey: ["admin-discount-codes"] });
    toast.success("Code deleted");
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Discount codes</h2>
        <Button size="sm" variant="hero" onClick={() => setShowForm((o) => !o)}>
          <Plus className="h-4 w-4" /> New code
        </Button>
      </div>

      {showForm && (
        <form onSubmit={createCode} className="mb-6 rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 font-medium">Create code</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <Label>Code</Label>
              <Input placeholder="SAVE20" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} required />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="fixed">Fixed (KES)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>{form.type === "percentage" ? "Discount %" : "Discount KES"}</Label>
              <Input type="number" min="1" placeholder={form.type === "percentage" ? "10" : "500"} value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Min order (KES)</Label>
              <Input type="number" min="0" placeholder="0" value={form.min_order_kes} onChange={(e) => setForm((f) => ({ ...f, min_order_kes: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Max uses (blank = unlimited)</Label>
              <Input type="number" min="1" placeholder="—" value={form.max_uses} onChange={(e) => setForm((f) => ({ ...f, max_uses: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Expiry date (optional)</Label>
              <Input type="date" value={form.expires_at} onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))} />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button type="submit" variant="hero" size="sm" disabled={creating}>
              {creating && <Loader2 className="h-4 w-4 animate-spin" />} Create
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
      ) : codes.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-16 text-center text-muted-foreground">No codes yet. Create one above.</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Min order</TableHead>
                <TableHead>Uses</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Active</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(codes as DiscountCode[]).map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono font-semibold">{c.code}</TableCell>
                  <TableCell>{c.type === "percentage" ? `${c.value}%` : formatKES(c.value)}</TableCell>
                  <TableCell>{c.min_order_kes > 0 ? formatKES(c.min_order_kes) : "—"}</TableCell>
                  <TableCell>{c.uses}{c.max_uses !== null ? ` / ${c.max_uses}` : ""}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString("en-KE") : "—"}
                  </TableCell>
                  <TableCell>
                    <Switch checked={c.is_active} onCheckedChange={(v) => toggleCode(c.id, v)} />
                  </TableCell>
                  <TableCell>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteCode(c.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
