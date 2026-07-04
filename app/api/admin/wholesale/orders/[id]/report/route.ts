export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import React from "react";
import path from "path";
import arabicReshaper from "arabic-reshaper";
import {
  Document,
  Font,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";
import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin/permissions";
import { formatVariantSnapshot } from "@/lib/product-variants";
import { getWholesaleOrderById } from "@/lib/server/wholesale-orders";
import type { WholesaleOrder, WholesaleOrderItem, WholesaleOrderStatus } from "@/types/wholesale";

Font.register({
  family: "Cairo",
  src: path.join(process.cwd(), "public", "fonts", "Cairo-VariableFont_slnt,wght.ttf"),
});

const A = {
  brand: "Cesar Store",
  reportTitle: "تقرير طلب الجملة",
  customerInfo: "بيانات عميل الجملة",
  orderInfo: "بيانات الطلب",
  products: "الأصناف",
  businessName: "اسم الكيان",
  contactName: "اسم المسؤول",
  phone: "الهاتف",
  whatsapp: "واتساب",
  address: "العنوان",
  city: "المدينة",
  orderNumber: "رقم الطلب",
  date: "تاريخ الطلب",
  status: "الحالة",
  notes: "ملاحظات",
  item: "الصنف",
  minQty: "أقل كمية",
  qty: "الكمية",
  price: "سعر القطعة",
  returned: "المردود",
  remaining: "المتبقي",
  total: "الإجمالي",
  grandTotal: "إجمالي طلب الجملة",
  printedAt: "وقت الطباعة",
  empty: "غير متوفر",
};

const statusLabels: Record<WholesaleOrderStatus, string> = {
  requested: "تم الاستلام",
  confirmed: "تم التأكيد",
  preparing: "جاري التحضير",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  canceled: "ملغى",
};

function smartText(value: string | number | null | undefined) {
  const text = String(value ?? "");
  if (!text) return "";

  if (!/[\u0600-\u06FF]/.test(text)) return text;

  try {
    const reshaper = (arabicReshaper as any).default || arabicReshaper;
    return reshaper.reshape(text).split(" ").reverse().join(" ");
  } catch {
    return text;
  }
}

function formatMoney(value: number, currency = "EGP") {
  return `${Number(value || 0).toLocaleString("ar-EG")} ${currency}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return A.empty;

  try {
    return new Intl.DateTimeFormat("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function customerText(order: WholesaleOrder, field: string) {
  const value = order.customerSnapshot?.[field];
  return typeof value === "string" && value.trim() ? value.trim() : A.empty;
}

function itemName(item: WholesaleOrderItem) {
  return item.productNameAr || item.productNameEn || A.empty;
}

function itemVariant(item: WholesaleOrderItem) {
  try {
    const variant = formatVariantSnapshot(item.variant, "ar");
    return typeof variant === "string" ? variant : "";
  } catch (error) {
    console.error("ADMIN WHOLESALE ORDER REPORT VARIANT ERROR:", {
      orderItemId: item.id,
      productId: item.productId,
      error,
    });
    return "";
  }
}

function quantity(value: number) {
  return `${Number(value || 0).toLocaleString("ar-EG")} قطعة`;
}

async function renderPdfBuffer(document: React.ReactElement) {
  const output = await pdf(document).toBuffer();

  if (Buffer.isBuffer(output)) {
    return output;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of output as AsyncIterable<Buffer | Uint8Array | string>) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

const styles = StyleSheet.create({
  page: {
    padding: 34,
    fontFamily: "Cairo",
    fontSize: 9,
    color: "#0f172a",
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottom: "1 solid #e2e8f0",
    paddingBottom: 16,
    marginBottom: 16,
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
  status: {
    marginTop: 6,
    fontSize: 10,
    color: "#475569",
    textAlign: "right",
  },
  grid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  card: {
    flex: 1,
    border: "1 solid #e2e8f0",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#f8fafc",
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: 900,
    color: "#0f172a",
    marginBottom: 8,
    textAlign: "right",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    borderBottom: "1 solid #e2e8f0",
    paddingVertical: 5,
  },
  label: {
    width: "35%",
    color: "#64748b",
    fontWeight: 700,
    textAlign: "right",
  },
  value: {
    width: "65%",
    color: "#111827",
    fontWeight: 900,
    textAlign: "right",
  },
  notes: {
    border: "1 solid #fde68a",
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    backgroundColor: "#fffbeb",
    color: "#92400e",
    textAlign: "right",
  },
  table: {
    border: "1 solid #e2e8f0",
    borderRadius: 10,
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row-reverse",
    backgroundColor: "#eff6ff",
    borderBottom: "1 solid #bfdbfe",
  },
  tableRow: {
    flexDirection: "row-reverse",
    borderBottom: "1 solid #e2e8f0",
    minHeight: 34,
  },
  cell: {
    padding: 7,
    textAlign: "right",
    borderLeft: "1 solid #e2e8f0",
  },
  headCell: {
    fontWeight: 900,
    color: "#1d4ed8",
  },
  productCell: {
    width: "30%",
  },
  smallCell: {
    width: "11%",
  },
  moneyCell: {
    width: "12%",
  },
  variant: {
    marginTop: 2,
    fontSize: 8,
    color: "#c2410c",
  },
  totalBox: {
    marginTop: 14,
    marginLeft: "auto",
    width: 220,
    border: "1 solid #bbf7d0",
    borderRadius: 10,
    padding: 12,
    backgroundColor: "#ecfdf5",
  },
  totalLabel: {
    color: "#047857",
    fontWeight: 900,
    textAlign: "right",
  },
  totalValue: {
    marginTop: 4,
    color: "#064e3b",
    fontSize: 16,
    fontWeight: 900,
    textAlign: "right",
  },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 34,
    right: 34,
    borderTop: "1 solid #e2e8f0",
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    color: "#64748b",
    fontSize: 8,
  },
});

function field(label: string, value: string | number | null | undefined) {
  return React.createElement(
    View,
    { style: styles.row },
    React.createElement(Text, { style: styles.value }, smartText(value || A.empty)),
    React.createElement(Text, { style: styles.label }, smartText(label))
  );
}

function headerCell(label: string, style: any) {
  return React.createElement(
    Text,
    { style: [styles.cell, styles.headCell, style] },
    smartText(label)
  );
}

function cell(value: string | number, style: any) {
  return React.createElement(
    Text,
    { style: [styles.cell, style] },
    smartText(value)
  );
}

function itemRow(item: WholesaleOrderItem, currency: string) {
  const returned = item.returnedUnits || 0;
  const remaining = Math.max(0, item.orderedUnits - returned);
  const variant = itemVariant(item);

  return React.createElement(
    View,
    { key: item.id, style: styles.tableRow },
    React.createElement(
      View,
      { style: [styles.cell, styles.productCell] },
      React.createElement(Text, null, smartText(itemName(item))),
      variant
        ? React.createElement(Text, { style: styles.variant }, smartText(variant))
        : null
    ),
    cell(quantity(item.minOrderUnits), styles.smallCell),
    cell(quantity(item.orderedUnits), styles.smallCell),
    cell(formatMoney(item.unitPrice, currency), styles.moneyCell),
    cell(quantity(returned), styles.smallCell),
    cell(quantity(remaining), styles.smallCell),
    cell(formatMoney(item.lineTotal, currency), styles.moneyCell)
  );
}

function WholesaleOrderReport({ order }: { order: WholesaleOrder }) {
  return React.createElement(
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
          React.createElement(Text, { style: styles.brand }, A.brand),
          React.createElement(Text, { style: styles.status }, smartText(formatDate(order.createdAt)))
        ),
        React.createElement(
          View,
          null,
          React.createElement(Text, { style: styles.title }, smartText(A.reportTitle)),
          React.createElement(Text, { style: styles.status }, smartText(statusLabels[order.status]))
        )
      ),
      React.createElement(
        View,
        { style: styles.grid },
        React.createElement(
          View,
          { style: styles.card },
          React.createElement(Text, { style: styles.cardTitle }, smartText(A.customerInfo)),
          field(A.businessName, customerText(order, "businessName")),
          field(A.contactName, customerText(order, "contactName")),
          field(A.phone, customerText(order, "phone")),
          field(A.whatsapp, customerText(order, "whatsapp")),
          field(A.city, `${customerText(order, "governorate")} / ${customerText(order, "city")}`),
          field(A.address, customerText(order, "address"))
        ),
        React.createElement(
          View,
          { style: styles.card },
          React.createElement(Text, { style: styles.cardTitle }, smartText(A.orderInfo)),
          field(A.orderNumber, order.orderNumber || order.id),
          field(A.date, formatDate(order.createdAt)),
          field(A.status, statusLabels[order.status]),
          field(A.total, formatMoney(order.subtotal, order.currency)),
          field(A.printedAt, formatDate(new Date().toISOString()))
        )
      ),
      order.notes
        ? React.createElement(Text, { style: styles.notes }, smartText(`${A.notes}: ${order.notes}`))
        : null,
      React.createElement(Text, { style: styles.cardTitle }, smartText(A.products)),
      React.createElement(
        View,
        { style: styles.table },
        React.createElement(
          View,
          { style: styles.tableHeader },
          headerCell(A.item, styles.productCell),
          headerCell(A.minQty, styles.smallCell),
          headerCell(A.qty, styles.smallCell),
          headerCell(A.price, styles.moneyCell),
          headerCell(A.returned, styles.smallCell),
          headerCell(A.remaining, styles.smallCell),
          headerCell(A.total, styles.moneyCell)
        ),
        order.items.map((item) => itemRow(item, order.currency))
      ),
      React.createElement(
        View,
        { style: styles.totalBox },
        React.createElement(Text, { style: styles.totalLabel }, smartText(A.grandTotal)),
        React.createElement(Text, { style: styles.totalValue }, formatMoney(order.subtotal, order.currency))
      ),
      React.createElement(
        View,
        { style: styles.footer },
        React.createElement(Text, null, A.brand),
        React.createElement(Text, null, smartText(`${A.printedAt}: ${formatDate(new Date().toISOString())}`))
      )
    )
  );
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const guard = await requireAdminRole(["full", "orders"]);
    if (guard.response) return guard.response;

    const order = await getWholesaleOrderById(params.id);

    if (!order) {
      return NextResponse.json(
        { error: "Wholesale order not found" },
        { status: 404 }
      );
    }

    const document = React.createElement(WholesaleOrderReport, { order });
    const buffer = await renderPdfBuffer(document);
    const fileId = order.orderNumber || order.id.slice(0, 8);

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="wholesale-order-${fileId}.pdf"`,
      },
    });
  } catch (error) {
    console.error("ADMIN WHOLESALE ORDER REPORT ERROR:", {
      orderId: params.id,
      error,
    });

    return NextResponse.json(
      { error: "Failed to generate wholesale order report" },
      { status: 500 }
    );
  }
}
