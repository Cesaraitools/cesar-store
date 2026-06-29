import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin/permissions";
import { updateWholesaleApplicationStatus } from "@/lib/server/wholesale-applications";
import type { WholesaleApplicationStatus } from "@/types/wholesale";

export const dynamic = "force-dynamic";

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
