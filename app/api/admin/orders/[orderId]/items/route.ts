import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin/permissions";
import { createServiceRoleClient } from "@/lib/supabase/runtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ERROR_STATUS: Record<string, number> = {
  ORDER_NOT_FOUND: 404,
  PRODUCT_NOT_FOUND: 404,
  ORDER_ITEMS_LOCKED: 409,
  PRICING_VERSION_CONFLICT: 409,
  INSUFFICIENT_PRODUCT_STOCK: 409,
  INSUFFICIENT_VARIANT_STOCK: 409,
  PRODUCT_INACTIVE: 409,
  VARIANT_INACTIVE: 409,
  ORDER_ITEMS_REQUIRED: 400,
  TOO_MANY_ORDER_ITEMS: 400,
  INVALID_ORDER_ITEM: 400,
  DUPLICATE_ORDER_ITEM: 400,
  VARIANT_REQUIRED: 400,
  VARIANT_NOT_FOUND: 400,
  VARIANT_NOT_ALLOWED: 400,
  INVALID_PRODUCT_PRICE: 400,
  DISCOUNT_EXCEEDS_NEW_SUBTOTAL: 400,
};

const ERROR_MESSAGES: Record<string, string> = {
  ORDER_NOT_FOUND: "الطلب غير موجود",
  PRODUCT_NOT_FOUND: "أحد المنتجات لم يعد موجودًا",
  ORDER_ITEMS_LOCKED: "لا يمكن تعديل الأصناف بعد شحن الطلب أو إغلاقه",
  PRICING_VERSION_CONFLICT:
    "تم تعديل الطلب من نافذة أخرى. أعد تحميل الصفحة ثم حاول مجددًا",
  INSUFFICIENT_PRODUCT_STOCK: "الكمية المطلوبة غير متوفرة في المخزون",
  INSUFFICIENT_VARIANT_STOCK: "كمية الاختيار المطلوب غير متوفرة في المخزون",
  PRODUCT_INACTIVE: "لا يمكن زيادة كمية منتج غير نشط",
  VARIANT_INACTIVE: "لا يمكن زيادة كمية اختيار غير نشط",
  ORDER_ITEMS_REQUIRED: "يجب أن يحتوي الطلب على صنف واحد على الأقل",
  TOO_MANY_ORDER_ITEMS: "عدد أصناف الطلب أكبر من الحد المسموح",
  INVALID_ORDER_ITEM: "بيانات أحد أصناف الطلب غير صحيحة",
  DUPLICATE_ORDER_ITEM: "يوجد صنف مكرر في الطلب",
  VARIANT_REQUIRED: "اختر المقاس أو اللون أو النوع المطلوب للصنف",
  VARIANT_NOT_FOUND: "اختيار الصنف لم يعد موجودًا",
  VARIANT_NOT_ALLOWED: "هذا المنتج لا يقبل اختيارًا إضافيًا",
  INVALID_PRODUCT_PRICE: "سعر أحد المنتجات غير صالح",
  DISCOUNT_EXCEEDS_NEW_SUBTOTAL:
    "الخصم الحالي أكبر من مجموع المنتجات الجديد. خفّض الخصم أولًا ثم أعد الحفظ",
};

type RequestedItem = {
  product_id: string;
  quantity: number;
  variant_key: string;
};

function parseItems(value: unknown): RequestedItem[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) {
    return null;
  }

  const parsed: RequestedItem[] = [];
  const keys = new Set<string>();

  for (const rawItem of value) {
    if (!rawItem || typeof rawItem !== "object") return null;

    const productId = String((rawItem as any).productId || "").trim();
    const variantKey = String((rawItem as any).variantKey || "").trim();
    const quantity = Number((rawItem as any).quantity);
    const key = `${productId}::${variantKey}`;

    if (
      !UUID_PATTERN.test(productId) ||
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      quantity > 9999 ||
      variantKey.length > 256 ||
      keys.has(key)
    ) {
      return null;
    }

    keys.add(key);
    parsed.push({
      product_id: productId,
      quantity,
      variant_key: variantKey,
    });
  }

  return parsed;
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
    const items = parseItems(body?.items);
    const expectedVersion = Number(body?.expectedVersion);

    if (!items || !Number.isInteger(expectedVersion) || expectedVersion < 0) {
      return NextResponse.json(
        { error: "بيانات تعديل أصناف الطلب غير صحيحة" },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc("update_order_items_atomic", {
      p_order_id: params.orderId,
      p_items: items,
      p_admin_email: guard.access.userEmail || "admin",
      p_expected_version: expectedVersion,
    });

    if (error) {
      const code = databaseErrorCode(error.message || "");
      console.error("Order item update failed", {
        orderId: params.orderId,
        code,
        error,
      });

      return NextResponse.json(
        { error: code ? ERROR_MESSAGES[code] : "تعذر حفظ أصناف الطلب" },
        { status: code ? ERROR_STATUS[code] : 500 }
      );
    }

    const order = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({ ok: true, order });
  } catch (error) {
    console.error("Order item route crashed", error);
    return NextResponse.json(
      { error: "حدث خطأ غير متوقع أثناء حفظ أصناف الطلب" },
      { status: 500 }
    );
  }
}
