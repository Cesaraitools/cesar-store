import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin/permissions";
import { deleteWholesaleCustomerAccount } from "@/lib/server/wholesale-applications";

export const dynamic = "force-dynamic";

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "تعذر حذف حساب عميل الجملة";
}

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
        error: getErrorMessage(error),
      },
      { status: 400 }
    );
  }
}
