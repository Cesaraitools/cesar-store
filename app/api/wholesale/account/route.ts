import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getWholesaleCustomerForAuthUser } from "@/lib/server/wholesale-applications";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "يرجى تسجيل الدخول أولا" }, { status: 401 });
    }

    const wholesaleCustomer = await getWholesaleCustomerForAuthUser(user.id);

    return NextResponse.json({ wholesaleCustomer });
  } catch (error) {
    console.error("WHOLESALE ACCOUNT ERROR:", error);

    return NextResponse.json(
      { error: "تعذر تحميل حساب الجملة" },
      { status: 500 }
    );
  }
}
