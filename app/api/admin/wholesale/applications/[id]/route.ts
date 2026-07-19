import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin/permissions";
import {
  deleteWholesaleApplication,
  updateWholesaleApplicationStatus,
} from "@/lib/server/wholesale-applications";
import type { WholesaleApplicationStatus } from "@/types/wholesale";

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

  return "تعذر معالجة طلب الجملة";
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdminRole(["full"]);
  if (guard.response) return guard.response;

  try {
    const body = (await request.json()) as {
      status?: WholesaleApplicationStatus;
      reviewNotes?: string | null;
    };

    if (!body.status) {
      return NextResponse.json({ error: "Missing status" }, { status: 400 });
    }

    const application = await updateWholesaleApplicationStatus({
      id: params.id,
      status: body.status,
      reviewNotes: body.reviewNotes,
      reviewedBy: guard.access.userEmail || "admin",
    });

    return NextResponse.json({ application });
  } catch (error) {
    console.error("ADMIN WHOLESALE APPLICATION UPDATE ERROR:", error);
    const errorText =
      error instanceof Error ? error.message : JSON.stringify(error || {});
    const isConnectionError = /fetch failed|ENOTFOUND|ECONNRESET|timeout/i.test(
      errorText
    );

    return NextResponse.json(
      {
        error: isConnectionError
          ? "تعذر الاتصال بقاعدة البيانات مؤقتا. حاول مرة أخرى بعد لحظات."
          : "تعذر تحديث حالة طلب الجملة",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const guard = await requireAdminRole(["full"]);
  if (guard.response) return guard.response;

  try {
    await deleteWholesaleApplication({
      applicationId: params.id,
      adminEmail: guard.access.userEmail,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("ADMIN WHOLESALE APPLICATION DELETE ERROR:", error);

    return NextResponse.json(
      {
        error: getErrorMessage(error),
      },
      { status: 400 }
    );
  }
}
