import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin/permissions";
import { deleteWholesaleCustomerAccount } from "@/lib/server/wholesale-applications";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdminRole(["full"]);
  if (guard.response) return guard.response;

  try {
    await deleteWholesaleCustomerAccount({
      customerId: params.id,
      adminEmail: guard.access.userEmail,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ADMIN WHOLESALE CUSTOMER DELETE ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "تعذر حذف حساب عميل الجملة",
      },
      { status: 400 }
    );
  }
}
