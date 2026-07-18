import { createServiceRoleClient } from "@/lib/supabase/runtime";
import type {
  WholesaleAdminReturn,
  WholesaleOrder,
  WholesaleOrderItem,
  WholesaleOrderReturn,
  WholesaleOrderStatus,
} from "@/types/wholesale";

const WHOLESALE_ORDER_STATUSES = new Set<WholesaleOrderStatus>([
  "requested",
  "confirmed",
  "preparing",
  "shipped",
  "delivered",
  "canceled",
]);

function normalizeWholesaleOrderStatus(status: unknown): WholesaleOrderStatus {
  switch (status) {
    case "new":
      return "requested";
    case "reviewing":
    case "contacted":
      return "confirmed";
    case "completed":
      return "delivered";
    case "cancelled":
      return "canceled";
    case "requested":
    case "confirmed":
    case "preparing":
    case "shipped":
    case "delivered":
    case "canceled":
      return status;
    default:
      return "requested";
  }
}

function cleanText(value: unknown, maxLength = 500) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function normalizeVariantKey(value: unknown) {
  return cleanText(value, 240);
}

function toNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function toInteger(value: unknown, fallback = 1) {
  const number = Math.floor(toNumber(value, fallback));
  return Number.isFinite(number) ? number : fallback;
}

function toOrderItem(row: any): WholesaleOrderItem {
  return {
    id: String(row.id),
    productId: String(row.product_id),
    productNameAr: row.product_name_ar || "",
    productNameEn: row.product_name_en || "",
    image: row.image || null,
    variantKey: normalizeVariantKey(row.variant_key),
    variant: row.variant_snapshot || null,
    unitType: "piece",
    unitLabel: "قطعة",
    quantityPerUnit: 1,
    minOrderUnits: Number(row.min_order_units || 1),
    orderedUnits: Number(row.ordered_units || 0),
    unitPrice: Number(row.unit_price || 0),
    lineTotal: Number(row.line_total || 0),
    stockSnapshot: Number(row.stock_snapshot || 0),
    returnedUnits: Number(row.returned_units || 0),
  };
}

function toOrderReturn(row: any): WholesaleOrderReturn {
  return {
    id: String(row.id),
    returnNumber: row.return_number || "",
    orderId: String(row.order_id),
    orderItemId: String(row.order_item_id),
    productId: String(row.product_id),
    returnedUnits: Number(row.returned_units || 0),
    reason: row.reason || "",
    note: row.note || null,
    createdBy: row.created_by || null,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

function withReturnedUnits(
  items: WholesaleOrderItem[],
  returns: WholesaleOrderReturn[]
) {
  const returnedByItemId = new Map<string, number>();

  for (const itemReturn of returns) {
    returnedByItemId.set(
      itemReturn.orderItemId,
      (returnedByItemId.get(itemReturn.orderItemId) || 0) +
        itemReturn.returnedUnits
    );
  }

  return items.map((item) => ({
    ...item,
    returnedUnits: returnedByItemId.get(item.id) || 0,
  }));
}

function toOrder(
  row: any,
  items: WholesaleOrderItem[] = [],
  returns: WholesaleOrderReturn[] = []
): WholesaleOrder {
  return {
    id: String(row.id),
    orderNumber: row.order_number || "",
    wholesaleCustomerId: String(row.wholesale_customer_id),
    authUserId: String(row.auth_user_id),
    status: normalizeWholesaleOrderStatus(row.status),
    subtotal: Number(row.subtotal || 0),
    currency: row.currency || "EGP",
    notes: row.notes || null,
    customerSnapshot:
      row.customer_snapshot && typeof row.customer_snapshot === "object"
        ? row.customer_snapshot
        : {},
    items: withReturnedUnits(items, returns),
    returns,
    stockDeductedAt: row.stock_deducted_at || null,
    stockRestoredAt: row.stock_restored_at || null,
    archivedAt: row.archived_at || null,
    archivedBy: row.archived_by || null,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

async function getActiveWholesaleCustomer(authUserId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("wholesale_customers")
    .select(
      [
        "id",
        "auth_user_id",
        "business_name",
        "contact_name",
        "phone",
        "whatsapp",
        "email",
        "governorate",
        "city",
        "address",
        "status",
      ].join(",")
    )
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) throw error;

  const customer = data as unknown as Record<string, any> | null;

  if (!customer || customer.status !== "active") {
    throw new Error("يجب تفعيل حساب الجملة قبل إرسال طلب جملة");
  }

  return customer;
}

async function getExistingOrderByToken(orderToken: string, authUserId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("wholesale_orders")
    .select("*")
    .eq("order_token", orderToken)
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { data: itemRows, error: itemsError } = await supabase
    .from("wholesale_order_items")
    .select("*")
    .eq("order_id", data.id)
    .order("created_at", { ascending: true });

  if (itemsError) throw itemsError;

  const returns = await fetchReturnsForOrderIds(supabase, [String(data.id)]);

  return toOrder(data, (itemRows || []).map(toOrderItem), returns);
}

async function fetchReturnsForOrderIds(supabase: any, orderIds: string[]) {
  if (!orderIds.length) return [];

  const { data, error } = await supabase
    .from("wholesale_order_returns")
    .select("*")
    .in("order_id", orderIds)
    .order("created_at", { ascending: true });

  if (error) {
    if (error.code === "42P01") return [];
    throw error;
  }

  return (data || []).map(toOrderReturn);
}

export async function getWholesaleOrderById(orderId: string) {
  const supabase = createServiceRoleClient();
  const { data: orderRow, error: orderError } = await supabase
    .from("wholesale_orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (orderError) throw orderError;
  if (!orderRow) return null;

  const { data: itemRows, error: itemsError } = await supabase
    .from("wholesale_order_items")
    .select("*")
    .eq("order_id", orderRow.id)
    .order("created_at", { ascending: true });

  if (itemsError) throw itemsError;

  const returns = await fetchReturnsForOrderIds(supabase, [String(orderRow.id)]);

  return toOrder(orderRow, (itemRows || []).map(toOrderItem), returns);
}

export async function createWholesaleOrderFromCart(input: {
  authUserId: string;
  orderToken: string;
  notes?: string | null;
}) {
  const orderToken = cleanText(input.orderToken, 120);

  if (!orderToken) {
    throw new Error("رمز طلب الجملة غير موجود");
  }

  const existingOrder = await getExistingOrderByToken(orderToken, input.authUserId);
  if (existingOrder) {
    return { order: existingOrder, reused: true };
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc(
    "create_wholesale_order_from_cart_atomic",
    {
      p_auth_user_id: input.authUserId,
      p_order_token: orderToken,
      p_notes: cleanText(input.notes || "", 1000) || null,
    }
  );

  if (error) throw error;

  const orderRow = Array.isArray(data) ? data[0] : data;

  if (!orderRow) {
    throw new Error("تعذر إنشاء طلب الجملة من السلة");
  }

  const order = await getWholesaleOrderById(String(orderRow.id));

  if (!order) {
    throw new Error("طلب الجملة غير موجود بعد الإنشاء");
  }

  return { order, reused: false };
}

export async function listWholesaleOrdersForUser(authUserId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("wholesale_orders")
    .select("*")
    .eq("auth_user_id", authUserId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;

  const orderRows = data || [];

  if (!orderRows.length) {
    return [];
  }

  const orderIds = orderRows.map((order) => order.id);
  const { data: itemRows, error: itemsError } = await supabase
    .from("wholesale_order_items")
    .select("*")
    .in("order_id", orderIds)
    .order("created_at", { ascending: true });

  if (itemsError) throw itemsError;

  const returns = await fetchReturnsForOrderIds(supabase, orderIds);
  const returnsByOrderId = new Map<string, WholesaleOrderReturn[]>();
  for (const itemReturn of returns) {
    const current = returnsByOrderId.get(itemReturn.orderId) || [];
    current.push(itemReturn);
    returnsByOrderId.set(itemReturn.orderId, current);
  }

  const itemsByOrderId = new Map<string, WholesaleOrderItem[]>();
  for (const item of itemRows || []) {
    const orderId = String(item.order_id);
    const current = itemsByOrderId.get(orderId) || [];
    current.push(toOrderItem(item));
    itemsByOrderId.set(orderId, current);
  }

  return orderRows.map((order) =>
    toOrder(
      order,
      itemsByOrderId.get(String(order.id)) || [],
      returnsByOrderId.get(String(order.id)) || []
    )
  );
}

export async function listWholesaleOrdersForAdmin(options?: {
  status?: WholesaleOrderStatus | "all";
  query?: string;
  dateFrom?: string;
  dateTo?: string;
  archived?: "active" | "archived" | "all";
}) {
  const supabase = createServiceRoleClient();
  let ordersQuery = supabase
    .from("wholesale_orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (
    options?.status &&
    options.status !== "all" &&
    WHOLESALE_ORDER_STATUSES.has(options.status)
  ) {
    ordersQuery = ordersQuery.eq("status", options.status);
  }

  if (options?.archived === "archived") {
    ordersQuery = ordersQuery.not("archived_at", "is", null);
  } else if (options?.archived !== "all") {
    ordersQuery = ordersQuery.is("archived_at", null);
  }

  const dateFrom = cleanText(options?.dateFrom || "", 40);
  const dateTo = cleanText(options?.dateTo || "", 40);

  if (dateFrom) {
    const fromDate = new Date(`${dateFrom}T00:00:00.000Z`);
    if (!Number.isNaN(fromDate.getTime())) {
      ordersQuery = ordersQuery.gte("created_at", fromDate.toISOString());
    }
  }

  if (dateTo) {
    const toDate = new Date(`${dateTo}T23:59:59.999Z`);
    if (!Number.isNaN(toDate.getTime())) {
      ordersQuery = ordersQuery.lte("created_at", toDate.toISOString());
    }
  }

  const { data: orders, error } = await ordersQuery;

  if (error) throw error;

  const normalizedQuery = cleanText(options?.query || "", 120).toLowerCase();
  const orderRows = normalizedQuery
    ? (orders || []).filter((order) => {
        const customer = order.customer_snapshot || {};
        const haystack = [
          order.order_number,
          order.id,
          customer.businessName,
          customer.contactName,
          customer.phone,
          customer.whatsapp,
          customer.email,
          customer.governorate,
          customer.city,
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalizedQuery);
      })
    : orders || [];

  if (!orderRows.length) {
    return [];
  }

  const orderIds = orderRows.map((order) => order.id);
  const { data: itemRows, error: itemsError } = await supabase
    .from("wholesale_order_items")
    .select("*")
    .in("order_id", orderIds)
    .order("created_at", { ascending: true });

  if (itemsError) throw itemsError;

  const returns = await fetchReturnsForOrderIds(supabase, orderIds);
  const returnsByOrderId = new Map<string, WholesaleOrderReturn[]>();
  for (const itemReturn of returns) {
    const current = returnsByOrderId.get(itemReturn.orderId) || [];
    current.push(itemReturn);
    returnsByOrderId.set(itemReturn.orderId, current);
  }

  const itemsByOrderId = new Map<string, WholesaleOrderItem[]>();
  for (const item of itemRows || []) {
    const orderId = String(item.order_id);
    const current = itemsByOrderId.get(orderId) || [];
    current.push(toOrderItem(item));
    itemsByOrderId.set(orderId, current);
  }

  return orderRows.map((order) =>
    toOrder(
      order,
      itemsByOrderId.get(String(order.id)) || [],
      returnsByOrderId.get(String(order.id)) || []
    )
  );
}

export async function listWholesaleReturnsForAdmin(options?: {
  query?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const orders = await listWholesaleOrdersForAdmin({
    status: "all",
    query: "",
  });

  const itemById = new Map<
    string,
    WholesaleOrderItem & { order: WholesaleOrder }
  >();
  for (const order of orders) {
    for (const item of order.items) {
      itemById.set(item.id, { ...item, order });
    }
  }

  const returns: WholesaleAdminReturn[] = [];
  for (const order of orders) {
    for (const itemReturn of order.returns) {
      const item = itemById.get(itemReturn.orderItemId);
      returns.push({
        ...itemReturn,
        orderNumber: order.orderNumber || order.id,
        orderStatus: order.status,
        orderCreatedAt: order.createdAt,
        customerSnapshot: order.customerSnapshot,
        productNameAr: item?.productNameAr || "",
        productNameEn: item?.productNameEn || "",
        variantKey: item?.variantKey,
        variant: item?.variant || null,
        unitPrice: item?.unitPrice || 0,
        lineTotal: item?.lineTotal || 0,
      });
    }
  }

  const normalizedQuery = cleanText(options?.query || "", 120).toLowerCase();
  const dateFrom = cleanText(options?.dateFrom || "", 40);
  const dateTo = cleanText(options?.dateTo || "", 40);
  const fromTime = dateFrom
    ? new Date(`${dateFrom}T00:00:00.000Z`).getTime()
    : null;
  const toTime = dateTo ? new Date(`${dateTo}T23:59:59.999Z`).getTime() : null;

  return (normalizedQuery
    ? returns.filter((itemReturn) =>
        [
          itemReturn.returnNumber,
          itemReturn.orderNumber,
          itemReturn.productNameAr,
          itemReturn.productNameEn,
          itemReturn.reason,
          itemReturn.note,
          itemReturn.customerSnapshot.businessName,
          itemReturn.customerSnapshot.contactName,
          itemReturn.customerSnapshot.phone,
          itemReturn.customerSnapshot.whatsapp,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery)
      )
    : returns
  )
    .filter((itemReturn) => {
      const createdTime = new Date(itemReturn.createdAt).getTime();
      if (Number.isNaN(createdTime)) return true;
      if (fromTime !== null && !Number.isNaN(fromTime) && createdTime < fromTime) {
        return false;
      }
      if (toTime !== null && !Number.isNaN(toTime) && createdTime > toTime) {
        return false;
      }
      return true;
    })
    .sort(
    (first, second) =>
      new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
  );
}

export async function updateWholesaleOrderStatus(
  orderId: string,
  status: WholesaleOrderStatus
) {
  const safeOrderId = cleanText(orderId, 80);

  if (!safeOrderId || !WHOLESALE_ORDER_STATUSES.has(status)) {
    throw new Error("حالة طلب الجملة غير صحيحة");
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc(
    "update_wholesale_order_status_atomic",
    {
      p_order_id: safeOrderId,
      p_status: status,
    }
  );

  if (error) throw error;
  const orderRow = Array.isArray(data) ? data[0] : data;

  if (!orderRow) {
    throw new Error("طلب الجملة غير موجود");
  }

  const order = await getWholesaleOrderById(String(orderRow.id));

  if (!order) {
    throw new Error("طلب الجملة غير موجود");
  }

  return order;
}

export async function archiveWholesaleOrder(input: {
  orderId: string;
  archived: boolean;
  adminEmail?: string | null;
}) {
  const orderId = cleanText(input.orderId, 80);

  if (!orderId) {
    throw new Error("طلب الجملة غير موجود");
  }

  const supabase = createServiceRoleClient();
  const archived = Boolean(input.archived);
  const adminEmail = cleanText(input.adminEmail || "", 200) || null;

  const { data, error } = await supabase.rpc(
    "archive_wholesale_order_atomic",
    {
      p_order_id: orderId,
      p_archived: archived,
      p_admin_email: adminEmail,
    }
  );

  if (error) {
    console.warn("WHOLESALE ORDER ARCHIVE RPC FAILED, USING DIRECT UPDATE:", {
      orderId,
      code: error.code,
      message: error.message,
      details: error.details,
    });

    const now = new Date().toISOString();
    const { data: fallbackOrder, error: fallbackError } = await supabase
      .from("wholesale_orders")
      .update({
        archived_at: archived ? now : null,
        archived_by: archived ? adminEmail : null,
        updated_at: now,
      })
      .eq("id", orderId)
      .select("id")
      .maybeSingle();

    if (fallbackError) {
      throw new Error(
        fallbackError.message || "تعذر تحديث أرشفة طلب الجملة"
      );
    }

    if (!fallbackOrder) {
      throw new Error("طلب الجملة غير موجود");
    }

    const { error: auditError } = await supabase.from("admin_audit_logs").insert({
      admin_email: adminEmail || "admin",
      action: archived ? "archive" : "restore",
      entity: "wholesale_orders",
      entity_id: orderId,
      payload: { archived },
      created_at: now,
    });

    if (auditError) {
      console.warn("WHOLESALE ORDER ARCHIVE AUDIT FAILED:", {
        orderId,
        code: auditError.code,
        message: auditError.message,
      });
    }

    const order = await getWholesaleOrderById(String(fallbackOrder.id));
    if (!order) {
      throw new Error("طلب الجملة غير موجود");
    }

    return order;
  }

  const orderRow = Array.isArray(data) ? data[0] : data;
  if (!orderRow) {
    throw new Error("طلب الجملة غير موجود");
  }

  const order = await getWholesaleOrderById(String(orderRow.id));
  if (!order) {
    throw new Error("طلب الجملة غير موجود");
  }

  return order;
}

export async function addWholesaleOrderItem(input: {
  orderId: string;
  productId: string;
  orderedUnits: number;
  variantKey?: string | null;
  variantSnapshot?: unknown;
  adminEmail?: string | null;
}) {
  const orderId = cleanText(input.orderId, 80);
  const productId = cleanText(input.productId, 80);
  const orderedUnits = toInteger(input.orderedUnits, 0);
  const variantKey = normalizeVariantKey(input.variantKey || "");

  if (!orderId || !productId || orderedUnits <= 0) {
    throw new Error("بيانات الصنف المضاف غير صحيحة");
  }

  const { data, error } = await createServiceRoleClient().rpc(
    "add_wholesale_order_item_atomic",
    {
      p_order_id: orderId,
      p_product_id: productId,
      p_ordered_units: orderedUnits,
      p_variant_key: variantKey,
      p_created_by: cleanText(input.adminEmail || "", 200) || null,
    }
  );

  if (error) throw error;

  const orderRow = Array.isArray(data) ? data[0] : data;
  if (!orderRow) {
    throw new Error("طلب الجملة غير موجود");
  }

  if (
    variantKey &&
    input.variantSnapshot &&
    typeof input.variantSnapshot === "object"
  ) {
    const { error: snapshotError } = await createServiceRoleClient()
      .from("wholesale_order_items")
      .update({ variant_snapshot: input.variantSnapshot })
      .eq("order_id", orderId)
      .eq("product_id", productId)
      .eq("variant_key", variantKey);

    if (snapshotError) throw snapshotError;
  }

  const order = await getWholesaleOrderById(String(orderRow.id));
  if (!order) {
    throw new Error("طلب الجملة غير موجود");
  }

  return order;
}

export async function deleteWholesaleOrderPermanently(input: {
  orderId: string;
  adminEmail?: string | null;
}) {
  const orderId = cleanText(input.orderId, 80);

  if (!orderId) {
    throw new Error("طلب الجملة غير موجود");
  }

  const order = await getWholesaleOrderById(orderId);

  if (!order) {
    throw new Error("طلب الجملة غير موجود");
  }

  if (!order.archivedAt) {
    throw new Error("يمكن حذف طلب الجملة نهائيًا من الأرشيف فقط");
  }

  const supabase = createServiceRoleClient();
  const adminEmail = cleanText(input.adminEmail || "", 200) || "admin";

  const { error: auditError } = await supabase.from("admin_audit_logs").insert({
    admin_email: adminEmail,
    action: "hard_delete",
    entity: "wholesale_orders",
    entity_id: orderId,
    payload: {
      orderNumber: order.orderNumber,
      status: order.status,
      subtotal: order.subtotal,
      returns: order.returns.length,
      items: order.items.length,
    },
    created_at: new Date().toISOString(),
  });

  if (auditError) {
    console.warn("WHOLESALE ORDER HARD DELETE AUDIT FAILED:", {
      orderId,
      code: auditError.code,
      message: auditError.message,
      details: auditError.details,
    });
  }

  const { error: returnsError } = await supabase
    .from("wholesale_order_returns")
    .delete()
    .eq("order_id", orderId);

  if (returnsError) throw returnsError;

  const { error: itemsError } = await supabase
    .from("wholesale_order_items")
    .delete()
    .eq("order_id", orderId);

  if (itemsError) throw itemsError;

  const { error: deleteError } = await supabase
    .from("wholesale_orders")
    .delete()
    .eq("id", orderId);

  if (deleteError) throw deleteError;

  return { id: orderId };
}

export async function createWholesaleOrderReturn(input: {
  orderId: string;
  orderItemId: string;
  returnedUnits: number;
  reason: string;
  note?: string | null;
  createdBy?: string | null;
}) {
  const orderId = cleanText(input.orderId, 80);
  const orderItemId = cleanText(input.orderItemId, 80);
  const returnedUnits = toInteger(input.returnedUnits, 0);
  const reason = cleanText(input.reason || "", 500);
  const note = cleanText(input.note || "", 1000);
  const createdBy = cleanText(input.createdBy || "", 200);

  if (!orderId || !orderItemId || returnedUnits <= 0) {
    throw new Error("بيانات مردود الجملة غير صحيحة");
  }

  const { error: returnError } = await createServiceRoleClient().rpc(
    "create_wholesale_order_return_atomic",
    {
      p_order_id: orderId,
      p_order_item_id: orderItemId,
      p_returned_units: returnedUnits,
      p_reason: reason || "unspecified",
      p_note: note || null,
      p_created_by: createdBy || null,
    }
  );

  if (returnError) throw returnError;

  const updatedOrder = await getWholesaleOrderById(orderId);

  if (!updatedOrder) {
    throw new Error("طلب الجملة غير موجود");
  }

  return updatedOrder;
}
