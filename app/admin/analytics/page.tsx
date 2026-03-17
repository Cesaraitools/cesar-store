"use client";

import { useEffect, useMemo, useState } from "react";

/* ================================
   Types (API Contract)
================================ */

type OrdersPerDay = {
  day: string;
  orders_count: number;
};

type RevenuePerDay = {
  day: string;
  currency: string;
  revenue: number;
};

type LifecycleDurations = {
  order_id: string;
  time_to_confirm: string | null;
  time_to_ship: string | null;
  time_to_deliver: string | null;
};

type MultipleVersions = {
  order_id: string;
  versions_count: number;
};

type OrdersIndexRow = {
  order_id: string;
  order_number: string;
  user_id: string | null;
  created_at: string;
  current_status: string | null;
  status_at: string | null;
};

type AnalyticsResponse = {
  volume: {
    total_orders: number;
  };
  financials: Array<{
    currency: string;
    revenue_sum: number;
    avg_order_value: number;
  }>;
  reliability: {
    cancel_rate: number;
    total_orders: number;
  };
  ordersPerDay: OrdersPerDay[];
  revenuePerDay: RevenuePerDay[];
  lifecycle: LifecycleDurations[];
  multipleVersions: MultipleVersions[];
  ordersIndex: OrdersIndexRow[];
};

/* ================================
   Helpers (UI ONLY)
================================ */

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function downloadCSV(rows: OrdersIndexRow[]) {
  const headers = [
    "order_id",
    "order_number",
    "user_id",
    "created_at",
    "current_status",
    "status_at",
  ];

  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.order_id,
        r.order_number,
        r.user_id ?? "",
        r.created_at,
        r.current_status ?? "",
        r.status_at ?? "",
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "orders_analytics.csv";
  a.click();

  URL.revokeObjectURL(url);
}

/* ================================
   Page
================================ */

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Table state (UI only)
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/admin/analytics");
        if (!res.ok) throw new Error("Failed to load analytics");

        const json = (await res.json()) as AnalyticsResponse;
        if (mounted) setData(json);
      } catch (err: any) {
        if (mounted) setError(err.message ?? "Unknown error");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-center text-sm text-muted-foreground">
        Loading analytics…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6 text-center text-sm text-red-600">
        Failed to load analytics data
      </div>
    );
  }

  const financial = data.financials[0];

  const totalPages = Math.ceil(
    data.ordersIndex.length / pageSize
  );

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return data.ordersIndex.slice(start, start + pageSize);
  }, [data.ordersIndex, page]);

  return (
    <div className="p-6 space-y-10">
      {/* Header */}
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Analytics Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          High-level overview of store performance
        </p>
      </header>

      {/* KPI Cards */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Key Metrics</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Total Orders" value={data.volume.total_orders} />
          <KpiCard
            label="Confirmed Revenue"
            value={
              financial
                ? `${financial.revenue_sum.toFixed(2)} ${financial.currency}`
                : "—"
            }
          />
          <KpiCard
            label="Avg Order Value"
            value={
              financial
                ? `${financial.avg_order_value.toFixed(2)} ${financial.currency}`
                : "—"
            }
          />
          <KpiCard
            label="Cancel Rate"
            value={`${(data.reliability.cancel_rate * 100).toFixed(1)}%`}
          />
        </div>
      </section>

      {/* Orders Table */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Orders</h2>
          <button
            onClick={() => downloadCSV(data.ordersIndex)}
            className="text-sm border rounded-md px-3 py-1 hover:bg-muted"
          >
            Export CSV
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border">
          <table className="min-w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-3 py-2 text-left">Order #</th>
                <th className="px-3 py-2 text-left">Customer</th>
                <th className="px-3 py-2 text-left">Created</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Updated</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((row) => (
                <tr key={row.order_id} className="border-t">
                  <td className="px-3 py-2">{row.order_number}</td>
                  <td className="px-3 py-2">
                    {row.user_id ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    {formatDate(row.created_at)}
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={row.current_status} />
                  </td>
                  <td className="px-3 py-2">
                    {formatDateTime(row.status_at)}
                  </td>
                </tr>
              ))}

              {!paginatedOrders.length && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-6 text-center text-muted-foreground"
                  >
                    No orders found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between text-sm">
          <span>
            Page {page} of {totalPages || 1}
          </span>

          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="border rounded px-2 py-1 disabled:opacity-50"
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="border rounded px-2 py-1 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ================================
   Components
================================ */

function KpiCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border p-4 space-y-1">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-muted-foreground">—</span>;

  const color =
    status === "delivered"
      ? "bg-green-100 text-green-700"
      : status === "canceled"
      ? "bg-red-100 text-red-700"
      : "bg-blue-100 text-blue-700";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}
    >
      {status}
    </span>
  );
}