import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin/permissions";
import { createServiceRoleClient } from "@/lib/supabase/runtime";
import type { WholesaleApplicationDocument } from "@/types/wholesale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RESET_CONFIRMATION = "تصفير الجملة";
const DEFAULT_RESET_EMAIL = "mohamed.seeking@gmail.com";

type WholesaleApplicationRow = {
  id: string;
  documents: WholesaleApplicationDocument[] | null;
};

function normalizeEmail(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function getAllowedResetEmail() {
  return normalizeEmail(
    process.env.WHOLESALE_TEST_RESET_EMAIL ||
      process.env.SUPER_ADMIN_EMAIL ||
      DEFAULT_RESET_EMAIL
  );
}

function isResetEnabled() {
  return process.env.WHOLESALE_TEST_RESET_ENABLED === "true";
}

function collectDocumentPaths(applications: WholesaleApplicationRow[]) {
  const paths = new Set<string>();

  for (const application of applications) {
    if (!Array.isArray(application.documents)) continue;

    for (const document of application.documents) {
      if (document?.storagePath) {
        paths.add(document.storagePath);
      }
    }
  }

  return Array.from(paths);
}

async function countRows(supabase: ReturnType<typeof createServiceRoleClient>, table: string) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });

  if (error) throw error;
  return count || 0;
}

async function getResetSummary() {
  const supabase = createServiceRoleClient();
  const [
    applications,
    customers,
    carts,
    cartItems,
    orders,
    orderItems,
    returns,
  ] = await Promise.all([
    countRows(supabase, "wholesale_applications"),
    countRows(supabase, "wholesale_customers"),
    countRows(supabase, "wholesale_carts"),
    countRows(supabase, "wholesale_cart_items"),
    countRows(supabase, "wholesale_orders"),
    countRows(supabase, "wholesale_order_items"),
    countRows(supabase, "wholesale_order_returns"),
  ]);

  const { count: deductedOrders, error } = await supabase
    .from("wholesale_orders")
    .select("id", { count: "exact", head: true })
    .not("stock_deducted_at", "is", null)
    .is("stock_restored_at", null);

  if (error) throw error;

  return {
    applications,
    customers,
    carts,
    cartItems,
    orders,
    orderItems,
    returns,
    deductedOrders: deductedOrders || 0,
  };
}

async function deleteByIds(
  supabase: ReturnType<typeof createServiceRoleClient>,
  table: string,
  ids: string[]
) {
  if (!ids.length) return;

  const { error } = await supabase.from(table).delete().in("id", ids);
  if (error) throw error;
}

export async function GET() {
  const guard = await requireAdminRole(["full"]);
  if (guard.response) return guard.response;

  try {
    const enabled = isResetEnabled();
    const allowedEmail = getAllowedResetEmail();
    const authorized = normalizeEmail(guard.access.userEmail) === allowedEmail;
    const summary = enabled && authorized ? await getResetSummary() : null;

    return NextResponse.json({
      enabled,
      authorized,
      allowedEmail,
      confirmation: RESET_CONFIRMATION,
      summary,
    });
  } catch (error) {
    console.error("ADMIN WHOLESALE RESET SUMMARY ERROR:", error);

    return NextResponse.json(
      { error: "تعذر تحميل حالة تصفير بيانات الجملة" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const guard = await requireAdminRole(["full"]);
  if (guard.response) return guard.response;

  try {
    const enabled = isResetEnabled();
    const allowedEmail = getAllowedResetEmail();
    const currentEmail = normalizeEmail(guard.access.userEmail);

    if (!enabled || currentEmail !== allowedEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);

    if (body?.confirmation !== RESET_CONFIRMATION) {
      return NextResponse.json(
        { error: "تأكيد تصفير بيانات الجملة غير صحيح" },
        { status: 400 }
      );
    }

    const summary = await getResetSummary();

    if (summary.deductedOrders > 0) {
      return NextResponse.json(
        {
          error:
            "لا يمكن تصفير بيانات الجملة قبل معالجة الطلبات التي خصمت من المخزون أو إرجاع مخزونها.",
          deductedOrders: summary.deductedOrders,
        },
        { status: 409 }
      );
    }

    const supabase = createServiceRoleClient();

    const { data: applicationRows, error: applicationsError } = await supabase
      .from("wholesale_applications")
      .select("id, documents");

    if (applicationsError) throw applicationsError;

    const applications = (applicationRows || []) as WholesaleApplicationRow[];
    const documentPaths = collectDocumentPaths(applications);

    if (documentPaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from("wholesale-documents")
        .remove(documentPaths);

      if (storageError) throw storageError;
    }

    const { data: orderRows, error: ordersError } = await supabase
      .from("wholesale_orders")
      .select("id");
    if (ordersError) throw ordersError;

    const { data: cartRows, error: cartsError } = await supabase
      .from("wholesale_carts")
      .select("id");
    if (cartsError) throw cartsError;

    const { data: customerRows, error: customersError } = await supabase
      .from("wholesale_customers")
      .select("id");
    if (customersError) throw customersError;

    const orderIds = (orderRows || []).map((row) => String(row.id));
    const cartIds = (cartRows || []).map((row) => String(row.id));
    const customerIds = (customerRows || []).map((row) => String(row.id));
    const applicationIds = applications.map((row) => row.id);

    if (orderIds.length > 0) {
      const { error: returnsError } = await supabase
        .from("wholesale_order_returns")
        .delete()
        .in("order_id", orderIds);
      if (returnsError) throw returnsError;

      const { error: itemsError } = await supabase
        .from("wholesale_order_items")
        .delete()
        .in("order_id", orderIds);
      if (itemsError) throw itemsError;
    }

    if (cartIds.length > 0) {
      const { error: cartItemsError } = await supabase
        .from("wholesale_cart_items")
        .delete()
        .in("cart_id", cartIds);
      if (cartItemsError) throw cartItemsError;
    }

    await deleteByIds(supabase, "wholesale_orders", orderIds);
    await deleteByIds(supabase, "wholesale_carts", cartIds);
    await deleteByIds(supabase, "wholesale_customers", customerIds);
    await deleteByIds(supabase, "wholesale_applications", applicationIds);

    return NextResponse.json({
      ok: true,
      deleted: {
        ...summary,
        documents: documentPaths.length,
      },
    });
  } catch (error) {
    console.error("ADMIN WHOLESALE RESET ERROR:", error);

    return NextResponse.json(
      { error: "تعذر تصفير بيانات اختبار الجملة" },
      { status: 500 }
    );
  }
}
