import { NextResponse } from "next/server";
import { getWholesaleApplicationStatus } from "@/lib/server/wholesale-applications";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id") || "";
    const phone = url.searchParams.get("phone") || "";
    const application = await getWholesaleApplicationStatus({ id, phone });

    if (!application) {
      return NextResponse.json(
        { error: "لم يتم العثور على طلب مطابق بهذه البيانات" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { application },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    );
  } catch (error) {
    console.error("WHOLESALE APPLICATION STATUS ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "تعذر تحميل حالة طلب الجملة",
      },
      { status: 400 }
    );
  }
}
