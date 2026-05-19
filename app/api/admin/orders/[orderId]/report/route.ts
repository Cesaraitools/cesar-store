export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import React from "react";
import path from "path";
import arabicReshaper from "arabic-reshaper";
import QRCode from "qrcode";
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { validateAdminSession } from "@/lib/admin/validateAdminSession";
import { createServiceRoleClient } from "@/lib/supabase/runtime";

Font.register({
  family: "Cairo",
  src: path.join(process.cwd(), "public", "fonts", "Cairo-VariableFont_slnt,wght.ttf"),
});

const A = {
  reportTitle: "\u062a\u0642\u0631\u064a\u0631 \u062a\u0633\u0644\u064a\u0645 \u0627\u0644\u0637\u0644\u0628",
  customerInfo: "\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u0639\u0645\u064a\u0644",
  orderInfo: "\u0645\u0639\u0644\u0648\u0645\u0627\u062a \u0627\u0644\u0637\u0644\u0628",
  products: "\u0627\u0644\u0645\u0646\u062a\u062c\u0627\u062a",
  name: "\u0627\u0644\u0627\u0633\u0645",
  phone: "\u0627\u0644\u0647\u0627\u062a\u0641",
  address: "\u0627\u0644\u0639\u0646\u0648\u0627\u0646",
  email: "\u0627\u0644\u0628\u0631\u064a\u062f \u0627\u0644\u0625\u0644\u0643\u062a\u0631\u0648\u0646\u064a",
  orderNumber: "\u0631\u0642\u0645 \u0627\u0644\u0637\u0644\u0628",
  date: "\u0627\u0644\u062a\u0627\u0631\u064a\u062e",
  status: "\u0627\u0644\u062d\u0627\u0644\u0629",
  item: "\u0627\u0644\u0635\u0646\u0641",
  qty: "\u0627\u0644\u0643\u0645\u064a\u0629",
  price: "\u0627\u0644\u0633\u0639\u0631",
  total: "\u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a",
  qrNote:
    "\u0627\u0645\u0633\u062d \u0627\u0644\u0631\u0645\u0632 \u0644\u062a\u062a\u0628\u0639 \u0627\u0644\u0637\u0644\u0628 \u0628\u0639\u062f \u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644",
  empty: "\u063a\u064a\u0631 \u0645\u062a\u0648\u0641\u0631",
};

function smartText(value: string | number | null | undefined) {
  const text = String(value ?? "");
  if (!text) return "";

  if (!/[\u0600-\u06FF]/.test(text)) {
    return text;
  }

  try {
    const reshaper = (arabicReshaper as any).default || arabicReshaper;
    return reshaper.reshape(text).split(" ").reverse().join(" ");
  } catch {
    return text;
  }
}

function getOrderTrackingUrl(request: Request, orderId: string) {
  const requestUrl = new URL(request.url);
  const rawBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;
  const baseUrl = rawBaseUrl.replace(/\/+$/, "");
  const redirect = `/orders/${orderId}`;

  return `${baseUrl}/auth/login?redirect=${encodeURIComponent(redirect)}`;
}

function getItemName(item: any) {
  return (
    item?.name ||
    item?.name_ar ||
    item?.name_en ||
    item?.product?.name_ar ||
    item?.product?.name_en ||
    item?.product?.name ||
    "-"
  );
}

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: "Cairo",
    fontSize: 10,
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottom: "1 solid #e2e8f0",
    paddingBottom: 18,
    marginBottom: 18,
  },
  brand: {
    fontSize: 18,
    fontWeight: 900,
    color: "#111827",
  },
  title: {
    fontSize: 16,
    fontWeight: 900,
    color: "#2563eb",
    textAlign: "right",
  },
  grid: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    border: "1 solid #e2e8f0",
    borderRadius: 12,
    padding: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 900,
    marginBottom: 10,
    color: "#2563eb",
    textAlign: "right",
  },
  line: {
    marginBottom: 6,
    textAlign: "right",
  },
  label: {
    color: "#64748b",
  },
  qrWrap: {
    width: 150,
    alignItems: "center",
    border: "1 solid #e2e8f0",
    borderRadius: 12,
    padding: 10,
  },
  qr: {
    width: 118,
    height: 118,
  },
  qrText: {
    marginTop: 8,
    fontSize: 8,
    color: "#475569",
    textAlign: "center",
  },
  table: {
    border: "1 solid #e2e8f0",
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 4,
  },
  row: {
    flexDirection: "row-reverse",
    borderBottom: "1 solid #f1f5f9",
    minHeight: 30,
    alignItems: "center",
  },
  tableHeader: {
    backgroundColor: "#f8fafc",
    fontWeight: 900,
  },
  colName: {
    width: "46%",
    padding: 8,
    textAlign: "right",
  },
  colQty: {
    width: "14%",
    padding: 8,
    textAlign: "center",
  },
  colPrice: {
    width: "20%",
    padding: 8,
    textAlign: "center",
  },
  colTotal: {
    width: "20%",
    padding: 8,
    textAlign: "center",
  },
  totalBox: {
    marginTop: 14,
    alignSelf: "flex-start",
    border: "1 solid #dbeafe",
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    padding: 12,
    minWidth: 180,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    color: "#94a3b8",
    fontSize: 8,
    borderTop: "1 solid #f1f5f9",
    paddingTop: 10,
    textAlign: "center",
  },
});

export async function GET(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    if (!(await validateAdminSession())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceRoleClient();
    const { data: order, error } = await supabase
      .from("orders")
      .select(
        "id, order_number, status, total, currency, created_at, customer_snapshot, items_snapshot"
      )
      .eq("id", params.orderId)
      .maybeSingle();

    if (error || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const customer = order.customer_snapshot || {};
    const items = Array.isArray(order.items_snapshot) ? order.items_snapshot : [];
    const trackingUrl = getOrderTrackingUrl(request, order.id);
    const qrDataUrl = await QRCode.toDataURL(trackingUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 360,
    });

    const document = React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        { size: "A4", style: styles.page },
        React.createElement(
          View,
          { style: styles.header },
          React.createElement(
            View,
            null,
            React.createElement(Text, { style: styles.brand }, "CESAR STORE"),
            React.createElement(Text, null, `Order ${order.order_number || order.id.slice(0, 8)}`)
          ),
          React.createElement(Text, { style: styles.title }, smartText(A.reportTitle))
        ),
        React.createElement(
          View,
          { style: styles.grid },
          React.createElement(
            View,
            { style: styles.card },
            React.createElement(Text, { style: styles.sectionTitle }, smartText(A.customerInfo)),
            React.createElement(Text, { style: styles.line }, `${smartText(A.name)}: ${smartText(customer.name || A.empty)}`),
            React.createElement(Text, { style: styles.line }, `${smartText(A.phone)}: ${customer.phone || "-"}`),
            React.createElement(Text, { style: styles.line }, `${smartText(A.address)}: ${smartText(customer.address || A.empty)}`),
            React.createElement(Text, { style: styles.line }, `${smartText(A.email)}: ${customer.email || "-"}`)
          ),
          React.createElement(
            View,
            { style: styles.card },
            React.createElement(Text, { style: styles.sectionTitle }, smartText(A.orderInfo)),
            React.createElement(Text, { style: styles.line }, `${smartText(A.orderNumber)}: ${order.order_number || order.id}`),
            React.createElement(Text, { style: styles.line }, `${smartText(A.date)}: ${new Date(order.created_at).toLocaleDateString("en-GB")}`),
            React.createElement(Text, { style: styles.line }, `${smartText(A.status)}: ${order.status || "requested"}`)
          ),
          React.createElement(
            View,
            { style: styles.qrWrap },
            React.createElement(Image, { src: qrDataUrl, style: styles.qr }),
            React.createElement(Text, { style: styles.qrText }, smartText(A.qrNote))
          )
        ),
        React.createElement(Text, { style: styles.sectionTitle }, smartText(A.products)),
        React.createElement(
          View,
          { style: styles.table },
          React.createElement(
            View,
            { style: [styles.row, styles.tableHeader] },
            React.createElement(Text, { style: styles.colName }, smartText(A.item)),
            React.createElement(Text, { style: styles.colQty }, smartText(A.qty)),
            React.createElement(Text, { style: styles.colPrice }, smartText(A.price)),
            React.createElement(Text, { style: styles.colTotal }, smartText(A.total))
          ),
          ...items.map((item: any, index: number) => {
            const price = Number(item?.price || 0);
            const quantity = Number(item?.quantity || 0);
            return React.createElement(
              View,
              { key: `${index}-${getItemName(item)}`, style: styles.row },
              React.createElement(Text, { style: styles.colName }, smartText(getItemName(item))),
              React.createElement(Text, { style: styles.colQty }, String(quantity)),
              React.createElement(Text, { style: styles.colPrice }, `${price} ${order.currency || "EGP"}`),
              React.createElement(Text, { style: styles.colTotal }, `${price * quantity} ${order.currency || "EGP"}`)
            );
          })
        ),
        React.createElement(
          View,
          { style: styles.totalBox },
          React.createElement(Text, { style: { fontWeight: 900 } }, `${smartText(A.total)}: ${order.total} ${order.currency || "EGP"}`)
        ),
        React.createElement(
          Text,
          { style: styles.footer },
          `Printed ${new Date().toLocaleString("en-GB")} - ${trackingUrl}`
        )
      )
    );

    const buffer = await pdf(document).toBuffer();

    return new Response(buffer as any, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=order-report-${order.id}.pdf`,
      },
    });
  } catch (error) {
    console.error("Admin order report PDF error:", error);
    return NextResponse.json(
      { error: "Failed to generate order report" },
      { status: 500 }
    );
  }
}
