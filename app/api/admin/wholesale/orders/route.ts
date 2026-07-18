import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin/permissions";
import { listWholesaleOrdersForAdmin } from "@/lib/server/wholesale-orders";
import type { WholesaleOrderStatus } from "@/types/wholesale";

export const dynamic = "force-dynamic";

const ORDER_STATUSES = new Set<WholesaleOrderStatus>([
  "requested",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
  "canceled",
]);

export async function GET(request: Request) {
  const guard = await requireAdminRole(["full"]);
  if (guard.response) return guard.response;

  try {
    const url = new URL(request.url);
    const rawStatus = url.searchParams.get("status") || "all";
    const status =
      rawStatus !== "all" && ORDER_STATUSES.has(rawStatus as WholesaleOrderStatus)
        ? (rawStatus as WholesaleOrderStatus)
        : "all";
    const query = url.searchParams.get("q") || "";
    const orders = await listWholesaleOrdersForAdmin({
      status,
      query,
      dateFrom: url.searchParams.get("from") || "",
      dateTo: url.searchParams.get("to") || "",
      archived:
        url.searchParams.get("archived") === "archived"
          ? "archived"
          : url.searchParams.get("archived") === "all"
            ? "all"
            : "active",
    });

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("ADMIN WHOLESALE ORDERS ERROR:", error);

    return NextResponse.json(
      { error: "تعذر تحميل طلبات الجملة" },
      { status: 500 }
    );
  }
}
