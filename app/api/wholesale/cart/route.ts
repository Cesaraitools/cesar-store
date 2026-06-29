import { NextResponse } from "next/server";
import {
  addWholesaleCartItem,
  clearWholesaleCart,
  listWholesaleCartItems,
  removeWholesaleCartItem,
  replaceWholesaleCartItems,
  updateWholesaleCartItem,
} from "@/lib/server/wholesale-cart";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

async function getUserId() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;
  return user.id;
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
    if (!(await rateLimit(`${getRequestIp(request)}:wholesale-cart:get`, 60, 60000))) {
      return NextResponse.json({ error: "طلبات كثيرة خلال وقت قصير. حاول مرة أخرى بعد لحظات." }, { status: 429 });
    }

    const authUserId = await getUserId();
    if (!authUserId) {
      return NextResponse.json({ error: "يرجى تسجيل الدخول أولا" }, { status: 401 });
    }

    const items = await listWholesaleCartItems(authUserId);

    return NextResponse.json({ items });
  } catch (error) {
    console.error("WHOLESALE CART GET ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "تعذر تحميل سلة الجملة",
      },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!(await rateLimit(`${getRequestIp(request)}:wholesale-cart:post`, 60, 60000))) {
      return NextResponse.json({ error: "طلبات كثيرة خلال وقت قصير. حاول مرة أخرى بعد لحظات." }, { status: 429 });
    }

    const authUserId = await getUserId();
    if (!authUserId) {
      return NextResponse.json({ error: "يرجى تسجيل الدخول أولا" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const items = await addWholesaleCartItem({
      authUserId,
      productId: String(body?.productId || ""),
      orderedUnits: Number(body?.orderedUnits || 0),
      variantKey: String(body?.variantKey || body?.variant_key || ""),
      variant: body?.variant || body?.variant_snapshot || null,
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("WHOLESALE CART POST ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "تعذر إضافة الصنف لسلة الجملة",
      },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    if (!(await rateLimit(`${getRequestIp(request)}:wholesale-cart:patch`, 120, 60000))) {
      return NextResponse.json({ error: "طلبات كثيرة خلال وقت قصير. حاول مرة أخرى بعد لحظات." }, { status: 429 });
    }

    const authUserId = await getUserId();
    if (!authUserId) {
      return NextResponse.json({ error: "يرجى تسجيل الدخول أولا" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);

    if (Array.isArray(body?.items)) {
      const items = await replaceWholesaleCartItems({
        authUserId,
        items: body.items,
      });

      return NextResponse.json({ items });
    }

    const items = await updateWholesaleCartItem({
      authUserId,
      productId: String(body?.productId || ""),
      orderedUnits: Number(body?.orderedUnits || 0),
      variantKey: String(body?.variantKey || body?.variant_key || ""),
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("WHOLESALE CART PATCH ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "تعذر تحديث سلة الجملة",
      },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await rateLimit(`${getRequestIp(request)}:wholesale-cart:delete`, 60, 60000))) {
      return NextResponse.json({ error: "طلبات كثيرة خلال وقت قصير. حاول مرة أخرى بعد لحظات." }, { status: 429 });
    }

    const authUserId = await getUserId();
    if (!authUserId) {
      return NextResponse.json({ error: "يرجى تسجيل الدخول أولا" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const items = body?.clear
      ? await clearWholesaleCart(authUserId)
      : await removeWholesaleCartItem({
          authUserId,
          productId: String(body?.productId || ""),
          variantKey: String(body?.variantKey || body?.variant_key || ""),
        });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("WHOLESALE CART DELETE ERROR:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "تعذر حذف الصنف من سلة الجملة",
      },
      { status: 400 }
    );
  }
}
