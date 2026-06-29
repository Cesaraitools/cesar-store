import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin/permissions";
import { listWholesaleApplications } from "@/lib/server/wholesale-applications";

export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireAdminRole(["full"]);
  if (guard.response) return guard.response;

  try {
    const applications = await listWholesaleApplications();
    return NextResponse.json({ applications });
  } catch (error) {
    console.error("ADMIN WHOLESALE APPLICATIONS ERROR:", error);

    return NextResponse.json(
      { error: "تعذر تحميل طلبات الانضمام للجملة" },
      { status: 500 }
    );
  }
}
