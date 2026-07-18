import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin/permissions";
import { deleteWholesaleOrderPermanently } from "@/lib/server/wholesale-orders";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdminRole(["full"]);
  if (guard.response) return guard.response;

  try {
    await deleteWholesaleOrderPermanently({
      orderId: params.id,
      adminEmail: guard.access.userEmail,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ADMIN WHOLESALE ORDER HARD DELETE ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "تعذر حذف طلب الجملة نهائيًا",
      },
      { status: 400 }
    );
  }
}
