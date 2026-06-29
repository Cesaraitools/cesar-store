import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin/permissions";
import { createWholesaleOrderReturn } from "@/lib/server/wholesale-orders";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdminRole(["full"]);
  if (guard.response) return guard.response;

  try {
    const body = await request.json().catch(() => null);
    const order = await createWholesaleOrderReturn({
      orderId: params.id,
      orderItemId: String(body?.orderItemId || ""),
      returnedUnits: Number(body?.returnedUnits || 0),
      reason: String(body?.reason || ""),
      note: body?.note ? String(body.note) : null,
      createdBy: guard.access.userEmail,
    });

    return NextResponse.json({ order });
  } catch (error) {
    console.error("ADMIN WHOLESALE ORDER RETURN ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "تعذر تسجيل مردود الجملة",
      },
      { status: 400 }
    );
  }
}
