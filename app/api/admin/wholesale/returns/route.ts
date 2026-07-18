import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin/permissions";
import { listWholesaleReturnsForAdmin } from "@/lib/server/wholesale-orders";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireAdminRole(["full"]);
  if (guard.response) return guard.response;

  try {
    const url = new URL(request.url);
    const returns = await listWholesaleReturnsForAdmin({
      query: url.searchParams.get("q") || "",
      dateFrom: url.searchParams.get("from") || "",
      dateTo: url.searchParams.get("to") || "",
    });

    return NextResponse.json({ returns });
  } catch (error) {
    console.error("ADMIN WHOLESALE RETURNS ERROR:", error);

    return NextResponse.json(
      { error: "تعذر تحميل مردودات الجملة" },
      { status: 500 }
    );
  }
}
