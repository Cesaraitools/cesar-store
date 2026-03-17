"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type OrderRow = {
  id: string;
  total: number;
  currency: string;
  created_at: string;
  status: string;
  customer_snapshot: {
    name?: string;
    email?: string;
    phone?: string;
  };
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ===== Pagination State ===== */

  const [page, setPage] = useState(1);
  const limit = 50;

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const res = await fetch(`/api/admin/orders?page=${page}&limit=${limit}`);

        if (!res.ok) {
          throw new Error("Failed to load orders");
        }

        const data = await res.json();
        setOrders(data.orders || []);
      } catch (err) {
        setError("حدث خطأ أثناء تحميل الطلبات");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [page]);

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500">
        جاري تحميل الطلبات...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        Admin Orders
      </h1>

      <div className="overflow-x-auto bg-white rounded-xl shadow">
        <table className="w-full border-collapse">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="p-3 text-sm font-semibold">Order ID</th>
              <th className="p-3 text-sm font-semibold">Date</th>
              <th className="p-3 text-sm font-semibold">Customer</th>
              <th className="p-3 text-sm font-semibold">Total</th>
              <th className="p-3 text-sm font-semibold">Status</th>
              <th className="p-3 text-sm font-semibold">View</th>
            </tr>
          </thead>

          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                className="border-t hover:bg-gray-50"
              >
                <td className="p-3 text-sm font-mono">
                  {order.id.slice(0, 8)}…
                </td>

                <td className="p-3 text-sm">
                  {new Date(order.created_at).toLocaleString()}
                </td>

                <td className="p-3 text-sm">
                  <div className="font-medium">
                    {order.customer_snapshot?.name || "—"}
                  </div>
                  <div className="text-gray-500 text-xs">
                    {order.customer_snapshot?.email || ""}
                  </div>
                </td>

                <td className="p-3 text-sm">
                  {order.total} {order.currency}
                </td>

                <td className="p-3 text-sm">
                  <span className="inline-block px-2 py-1 rounded bg-gray-200 text-gray-800 text-xs">
                    {order.status}
                  </span>
                </td>

                <td className="p-3 text-sm">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}

            {orders.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="p-6 text-center text-gray-500"
                >
                  لا توجد طلبات
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ===== Pagination Controls ===== */}

      <div className="flex justify-between items-center mt-6">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
        >
          Previous
        </button>

        <span className="text-sm text-gray-600">
          Page {page}
        </span>

        <button
          onClick={() => setPage((p) => p + 1)}
          className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-sm"
        >
          Next
        </button>
      </div>
    </div>
  );
}