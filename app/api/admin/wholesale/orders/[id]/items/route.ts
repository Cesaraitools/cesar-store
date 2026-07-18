import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin/permissions";
import { addWholesaleOrderItem } from "@/lib/server/wholesale-orders";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdminRole(["full"]);
  if (guard.response) return guard.response;

  try {
    const body = await request.json().catch(() => null);
    const order = await addWholesaleOrderItem({
      orderId: params.id,
      productId: String(body?.productId || ""),
      orderedUnits: Number(body?.orderedUnits || 0),
      variantKey: body?.variantKey ? String(body.variantKey) : "",
      variantSnapshot: body?.variantSnapshot || null,
      adminEmail: guard.access.userEmail,
    });

    return NextResponse.json({ order });
  } catch (error) {
    console.error("ADMIN WHOLESALE ORDER ADD ITEM ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "تعذر إضافة الصنف إلى طلب الجملة",
      },
      { status: 400 }
    );
  }
}
