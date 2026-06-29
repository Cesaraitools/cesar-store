import { NextResponse } from "next/server";
import {
  createWholesaleOrderFromCart,
  listWholesaleOrdersForUser,
} from "@/lib/server/wholesale-orders";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

async function getUser() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  return user;
}

function getRequestIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function GET(request: Request) {
  try {
    if (!(await rateLimit(`${getRequestIp(request)}:wholesale-orders:get`, 60, 60000))) {
      return NextResponse.json({ error: "طلبات كثيرة خلال وقت قصير. حاول مرة أخرى بعد لحظات." }, { status: 429 });
    }

    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "يرجى تسجيل الدخول أولا" }, { status: 401 });
    }

    const orders = await listWholesaleOrdersForUser(user.id);

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("WHOLESALE ORDERS LIST ERROR:", error);

    return NextResponse.json(
      { error: "تعذر تحميل طلبات الجملة" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!(await rateLimit(`${getRequestIp(request)}:wholesale-orders:post`, 10, 60000))) {
      return NextResponse.json({ error: "طلبات كثيرة خلال وقت قصير. حاول مرة أخرى بعد لحظات." }, { status: 429 });
    }

    const user = await getUser();

    if (!user) {
      return NextResponse.json({ error: "يرجى تسجيل الدخول أولا" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const { order, reused } = await createWholesaleOrderFromCart({
      authUserId: user.id,
      orderToken: body?.orderToken,
      notes: body?.notes,
    });

    return NextResponse.json({
      success: true,
      order,
      reused,
    });
  } catch (error) {
    console.error("WHOLESALE ORDER CREATE ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "تعذر إرسال طلب الجملة",
      },
      { status: 400 }
    );
  }
}

