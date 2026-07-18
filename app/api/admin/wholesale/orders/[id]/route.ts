import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin/permissions";
import {
  getWholesaleOrderById,
  updateWholesaleOrderStatus,
} from "@/lib/server/wholesale-orders";
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

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdminRole(["full"]);
  if (guard.response) return guard.response;

  try {
    const body = await request.json().catch(() => null);
    const status = body?.status as WholesaleOrderStatus;

    if (!ORDER_STATUSES.has(status)) {
      return NextResponse.json(
        { error: "Invalid wholesale order status" },
        { status: 400 }
      );
    }

    const order = await updateWholesaleOrderStatus(params.id, status);

    return NextResponse.json({ order });
  } catch (error) {
    console.error("ADMIN WHOLESALE ORDER UPDATE ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "تعذر تحديث طلب الجملة",
      },
      { status: 400 }
    );
  }
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdminRole(["full"]);
  if (guard.response) return guard.response;

  try {
    const order = await getWholesaleOrderById(params.id);

    if (!order) {
      return NextResponse.json(
        { error: "طلب الجملة غير موجود" },
        { status: 404 }
      );
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("ADMIN WHOLESALE ORDER GET ERROR:", error);

    return NextResponse.json(
      { error: "تعذر تحميل طلب الجملة" },
      { status: 500 }
    );
  }
}
