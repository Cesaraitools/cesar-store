import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin/permissions";
import { createServiceRoleClient } from "@/lib/supabase/runtime";
import { isShippingStatus } from "@/lib/order-pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ERROR_STATUS: Record<string, number> = {
  ORDER_NOT_FOUND: 404,
  ORDER_PRICING_LOCKED: 409,
  PRICING_VERSION_CONFLICT: 409,
  DISCOUNT_EXCEEDS_SUBTOTAL: 400,
  DISCOUNT_REASON_REQUIRED: 400,
  SHIPPING_FEE_REQUIRED: 400,
  SHIPPING_FEE_MUST_BE_ZERO: 400,
  NEGATIVE_PRICING_VALUE: 400,
  INVALID_SHIPPING_STATUS: 400,
};

function numberFromInput(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    return Number(value);
  }
  return Number.NaN;
}

function databaseErrorCode(message: string) {
  return Object.keys(ERROR_STATUS).find((code) => message.includes(code));
}

export async function PATCH(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const guard = await requireAdminRole(["full", "orders"]);
    if (guard.response) return guard.response;

    const body = await request.json().catch(() => null);
    const shippingStatus = body?.shippingStatus;
    const shippingFee = numberFromInput(body?.shippingFee);
    const discount = numberFromInput(body?.discount);
    const expectedVersion = numberFromInput(body?.expectedVersion);
    const discountReason = String(body?.discountReason || "").trim();

    if (
      !isShippingStatus(shippingStatus) ||
      shippingStatus === "legacy" ||
      !Number.isFinite(shippingFee) ||
      !Number.isFinite(discount) ||
      !Number.isInteger(expectedVersion) ||
      shippingFee < 0 ||
      discount < 0
    ) {
      return NextResponse.json(
        { error: "بيانات التسوية المالية غير صحيحة" },
        { status: 400 }
      );
    }

    if (shippingStatus === "set" && shippingFee <= 0) {
      return NextResponse.json(
        { error: "أدخل قيمة شحن أكبر من صفر" },
        { status: 400 }
      );
    }

    if (shippingStatus !== "set" && shippingFee !== 0) {
      return NextResponse.json(
        { error: "يجب أن تكون قيمة الشحن صفرًا عند الانتظار أو الإعفاء" },
        { status: 400 }
      );
    }

    if (discount > 0 && !discountReason) {
      return NextResponse.json(
        { error: "اكتب سبب الخصم لحفظ سجل مالي واضح" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc("update_order_pricing", {
      p_order_id: params.orderId,
      p_shipping_status: shippingStatus,
      p_shipping_fee: shippingFee,
      p_discount: discount,
      p_discount_reason: discountReason || null,
      p_admin_email: guard.access.userEmail || "admin",
      p_expected_version: expectedVersion,
    });

    if (error) {
      const code = databaseErrorCode(error.message || "");
      const messages: Record<string, string> = {
        ORDER_NOT_FOUND: "الطلب غير موجود",
        ORDER_PRICING_LOCKED: "لا يمكن تعديل التسوية بعد شحن الطلب أو إغلاقه",
        PRICING_VERSION_CONFLICT:
          "تم تعديل الطلب من نافذة أخرى. أعد تحميل الصفحة ثم حاول مجددًا",
        DISCOUNT_EXCEEDS_SUBTOTAL: "الخصم لا يمكن أن يتجاوز مجموع المنتجات",
        DISCOUNT_REASON_REQUIRED: "سبب الخصم مطلوب",
        SHIPPING_FEE_REQUIRED: "قيمة الشحن مطلوبة",
        SHIPPING_FEE_MUST_BE_ZERO: "قيمة الشحن غير متوافقة مع حالته",
        NEGATIVE_PRICING_VALUE: "لا يمكن استخدام قيمة سالبة",
        INVALID_SHIPPING_STATUS: "حالة الشحن غير صحيحة",
      };

      console.error("Order pricing update failed", {
        orderId: params.orderId,
        code,
        error,
      });

      return NextResponse.json(
        { error: code ? messages[code] : "تعذر حفظ التسوية المالية" },
        { status: code ? ERROR_STATUS[code] : 500 }
      );
    }

    const pricing = Array.isArray(data) ? data[0] : data;

    return NextResponse.json({ ok: true, pricing });
  } catch (error) {
    console.error("Order pricing route crashed", error);
    return NextResponse.json(
      { error: "حدث خطأ غير متوقع أثناء حفظ التسوية" },
      { status: 500 }
    );
  }
}
