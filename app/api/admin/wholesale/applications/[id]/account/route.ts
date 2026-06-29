import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin/permissions";
import {
  linkWholesaleCustomerAccount,
  updateWholesaleCustomerStatus,
} from "@/lib/server/wholesale-applications";
import type { WholesaleCustomerStatus } from "@/types/wholesale";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdminRole(["full"]);
  if (guard.response) return guard.response;

  try {
    const body = (await request.json()) as {
      action?: "link" | "status";
      accountEmail?: string;
      status?: WholesaleCustomerStatus;
    };

    if (body.action === "link") {
      const wholesaleCustomer = await linkWholesaleCustomerAccount({
        applicationId: params.id,
        accountEmail: body.accountEmail || "",
      });

      return NextResponse.json({ wholesaleCustomer });
    }

    if (body.action === "status" && body.status) {
      const wholesaleCustomer = await updateWholesaleCustomerStatus({
        applicationId: params.id,
        status: body.status,
      });

      return NextResponse.json({ wholesaleCustomer });
    }

    return NextResponse.json({ error: "Invalid account action" }, { status: 400 });
  } catch (error) {
    console.error("ADMIN WHOLESALE ACCOUNT UPDATE ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "تعذر تحديث حساب الجملة",
      },
      { status: 500 }
    );
  }
}
