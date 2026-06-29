import { NextResponse } from "next/server";
import { createWholesaleApplication } from "@/lib/server/wholesale-applications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const application = await createWholesaleApplication(formData);

    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    console.error("WHOLESALE APPLICATION CREATE ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "تعذر إرسال طلب الانضمام لتجارة الجملة",
      },
      { status: 400 }
    );
  }
}
