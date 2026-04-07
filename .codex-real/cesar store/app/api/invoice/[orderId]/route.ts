// app/api/invoice/[orderId]/route.ts

import { NextResponse } from "next/server";
import { validateAdminSession } from "@/lib/admin/validateAdminSession";
import { resolveRequestUser } from "@/lib/auth/resolveRequestUser";
import { createServiceRoleClient } from "@/lib/supabase/runtime";

/* ================= GET ================= */

export async function GET(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;
    const user = await resolveRequestUser(request);
    const isAdmin = validateAdminSession();
    const supabase = createServiceRoleClient();

    if (!user && !isAdmin) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const lang = searchParams.get("lang") ?? "ar";

    /* ================= Fetch Order ================= */

    let query = supabase
      .from("orders")
      .select(
        `
        id,
        created_at,
        currency,
        subtotal,
        total,
        customer_snapshot,
        items_snapshot,
        user_id
      `
      )
      .eq("id", orderId);

    if (!isAdmin && user) {
      query = query.eq("user_id", user.id);
    }

    const { data: order, error } = await query.single();

    if (error || !order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    /* ================= Build Invoice Contract ================= */

    const invoiceData = {
      invoice: {
        invoice_id: order.id,
        order_id: order.id,
        issued_at: new Date().toISOString(),
        currency: order.currency ?? "EGP",
        lang,
      },

      company: {
        name: "Cesar Store",
        logo_url: "/logo.png", // placeholder – يتعدل لاحقًا
        phone: "01211120208",
        address: "Egypt",
        email: null,
      },

      customer: {
        name: order.customer_snapshot?.name ?? "",
        phone: order.customer_snapshot?.phone ?? "",
        address: order.customer_snapshot?.address ?? "",
      },

      items: (order.items_snapshot ?? []).map((item: any) => ({
        product_id: item.product_id ?? null,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        line_total: item.price * item.quantity,
      })),

      totals: {
        subtotal: order.subtotal,
        shipping: 0,
        discount: 0,
        total: order.total,
      },

      footer: {
        note: "شكرًا لتسوقك من Cesar Store",
        printed_at: new Date().toISOString(),
      },
    };

    return NextResponse.json(invoiceData);
  } catch (err) {
    console.error("Invoice API error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
