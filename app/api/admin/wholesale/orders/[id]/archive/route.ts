import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin/permissions";
import { archiveWholesaleOrder } from "@/lib/server/wholesale-orders";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdminRole(["full"]);
  if (guard.response) return guard.response;

  try {
    const body = await request.json().catch(() => null);
    const order = await archiveWholesaleOrder({
      orderId: params.id,
      archived: body?.archived !== false,
      adminEmail: guard.access.userEmail,
    });

    return NextResponse.json({ order });
  } catch (error) {
    console.error("ADMIN WHOLESALE ORDER ARCHIVE ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "تعذر تحديث أرشفة طلب الجملة",
      },
      { status: 400 }
    );
  }
}
