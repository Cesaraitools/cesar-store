import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin/permissions";
import { createWholesaleDocumentSignedUrl } from "@/lib/server/wholesale-applications";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const guard = await requireAdminRole(["full"]);
  if (guard.response) return guard.response;

  try {
    const url = new URL(request.url);
    const path = url.searchParams.get("path") || "";
    const signedUrl = await createWholesaleDocumentSignedUrl(path);

    return NextResponse.json({ url: signedUrl });
  } catch (error) {
    console.error("ADMIN WHOLESALE DOCUMENT SIGN ERROR:", error);

    return NextResponse.json(
      { error: "تعذر فتح مستند طلب الجملة" },
      { status: 500 }
    );
  }
}
