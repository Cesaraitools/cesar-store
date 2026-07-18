import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin/permissions";
import { listWholesaleCustomersForAdmin } from "@/lib/server/wholesale-applications";
import type { WholesaleCustomerStatus } from "@/types/wholesale";

export const dynamic = "force-dynamic";

const CUSTOMER_STATUSES = new Set<WholesaleCustomerStatus>([
  "pending_account",
  "active",
  "suspended",
]);

export async function GET(request: Request) {
  const guard = await requireAdminRole(["full"]);
  if (guard.response) return guard.response;

  try {
    const url = new URL(request.url);
    const rawStatus = url.searchParams.get("status") || "all";
    const status =
      rawStatus !== "all" &&
      CUSTOMER_STATUSES.has(rawStatus as WholesaleCustomerStatus)
        ? (rawStatus as WholesaleCustomerStatus)
        : "all";
    const query = url.searchParams.get("q") || "";
    const customers = await listWholesaleCustomersForAdmin({ status, query });

    return NextResponse.json({ customers });
  } catch (error) {
    console.error("ADMIN WHOLESALE CUSTOMERS ERROR:", error);

    return NextResponse.json(
      { error: "تعذر تحميل عملاء الجملة" },
      { status: 500 }
    );
  }
}
