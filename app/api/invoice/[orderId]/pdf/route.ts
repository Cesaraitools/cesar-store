export const runtime = "nodejs";

import { createClient } from "@supabase/supabase-js";
import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Image,
  Font,
} from "@react-pdf/renderer";
import path from "path";
import fs from "fs";
import arabicReshaper from "arabic-reshaper";

/* ================= تسجيل الخطوط ================= */
Font.register({
  family: "Cairo",
  src: path.join(process.cwd(), "public", "fonts", "Cairo-VariableFont_slnt,wght.ttf"),
});

/* ================= معالجة النص ================= */
const smartText = (text: string) => {
  if (!text) return "";

  const hasArabic = /[\u0600-\u06FF]/.test(text);

  if (hasArabic) {
    try {
      const reshaper = (arabicReshaper as any).default || arabicReshaper;
      const reshaped = reshaper.reshape(text);
      return reshaped.split(" ").reverse().join(" ");
    } catch (e) {
      return text;
    }
  }
  return text;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

/* ================= Styles ================= */
const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 10,
    color: "#334155",
    backgroundColor: "#FFFFFF",
    fontFamily: "Cairo",
  },
  brandHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 40,
    borderBottom: "2 solid #F1F5F9",
    paddingBottom: 20,
  },
  brandName: {
    fontSize: 24,
    fontWeight: 900,
    color: "#0F172A",
  },
  rightHeaderSection: {
    alignItems: "flex-end",
  },
  logo: {
    width: 60,
    height: "auto",
    marginBottom: 10,
  },
  infoGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  infoBlock: {
    width: "45%",
    textAlign: "left",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderBottom: "1 solid #E2E8F0",
    padding: 10,
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1 solid #F1F5F9",
    padding: 10,
    alignItems: "center",
  },
  colDescription: { width: "50%", textAlign: "left" },
  colQty: { width: "15%", textAlign: "center" },
  colPrice: { width: "15%", textAlign: "right" },
  colAmount: { width: "20%", textAlign: "right" },
  summaryContainer: {
    marginTop: 30,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  footer: {
    position: "absolute",
    bottom: 50,
    left: 50,
    right: 50,
    textAlign: "center",
    borderTop: "1 solid #F1F5F9",
    paddingTop: 20,
    color: "#94A3B8",
    fontSize: 8,
  },
});

export async function GET(_req: Request, { params }: { params: { orderId: string } }) {
  const orderId = params.orderId;

  let logoBuffer;
  try {
    const logoPath = path.join(process.cwd(), "public", "logo (1).png");
    if (fs.existsSync(logoPath)) {
      logoBuffer = fs.readFileSync(logoPath);
    }
  } catch (err) {
    console.error("Logo Error:", err);
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id, created_at, currency, total, customer_snapshot, items_snapshot")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return Response.json({ error: "Order not found" }, { status: 404 });
  }

  const customer = order.customer_snapshot || {};
  const rawItems = Array.isArray(order.items_snapshot) ? order.items_snapshot : [];

  /* ================= ULTRA SAFE ADDITION ================= */
  const items = rawItems.map((item: any) => ({
    name: item?.name || "—",
    price: Number(item?.price || 0),
    quantity: Number(item?.quantity || 0),
  }));
  /* ===================================================== */

  const document = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },

      React.createElement(
        View,
        { style: styles.brandHeader },
        React.createElement(Text, { style: styles.brandName }, smartText("CESAR STORE")),
        React.createElement(
          View,
          { style: styles.rightHeaderSection },
          logoBuffer &&
            React.createElement(Image, {
              style: styles.logo,
              src: { data: logoBuffer, format: "png" },
            }),
          React.createElement(Text, null, smartText("Invoice / فاتورة")),
          React.createElement(Text, { style: { fontSize: 9 } }, `#${order.id.slice(0, 8)}`)
        )
      ),

      React.createElement(
        View,
        { style: styles.infoGrid },
        React.createElement(
          View,
          { style: styles.infoBlock },
          React.createElement(Text, { style: { color: "#94A3B8", fontSize: 8 } }, smartText("Billed To / فاتورة إلى:")),
          React.createElement(Text, { style: { fontWeight: 700 } }, smartText(customer.name || "Customer")),
          React.createElement(Text, null, customer.phone || ""),
          React.createElement(Text, null, smartText(customer.address || ""))
        ),
        React.createElement(
          View,
          { style: [styles.infoBlock, { alignItems: "flex-end" }] },
          React.createElement(Text, { style: { color: "#94A3B8", fontSize: 8 } }, smartText("Order Details / تفاصيل الطلب:")),
          React.createElement(Text, null, `Date: ${new Date(order.created_at).toLocaleDateString("en-US")}`),
          React.createElement(Text, null, `Currency: ${order.currency || "EGP"}`)
        )
      ),

      React.createElement(
        View,
        { style: { marginTop: 20 } },
        React.createElement(
          View,
          { style: styles.tableHeader },
          React.createElement(Text, { style: styles.colDescription }, smartText("Description / الوصف")),
          React.createElement(Text, { style: styles.colQty }, smartText("Qty / الكمية")),
          React.createElement(Text, { style: styles.colPrice }, smartText("Price / السعر")),
          React.createElement(Text, { style: styles.colAmount }, smartText("Amount / الإجمالي"))
        ),

        ...items.map((item: any) =>
          React.createElement(
            View,
            { style: styles.tableRow },
            React.createElement(Text, { style: styles.colDescription }, smartText(item.name)),
            React.createElement(Text, { style: styles.colQty }, String(item.quantity)),
            React.createElement(Text, { style: styles.colPrice }, `${item.price}`),
            React.createElement(Text, { style: styles.colAmount }, `${(item.price * item.quantity).toFixed(2)}`)
          )
        )
      ),

      React.createElement(
        View,
        { style: styles.summaryContainer },
        React.createElement(
          View,
          { style: { width: "40%", borderTop: "1 solid #E2E8F0", paddingTop: 10 } },
          React.createElement(
            View,
            { style: { flexDirection: "row", justifyContent: "space-between" } },
            React.createElement(Text, null, smartText("Total / الإجمالي")),
            React.createElement(
              Text,
              { style: { color: "#2563EB", fontWeight: 700, fontSize: 14 } },
              `${order.total} ${order.currency || "EGP"}`
            )
          )
        )
      ),

      React.createElement(
        View,
        { style: styles.footer },
        React.createElement(
          Text,
          null,
          smartText("Thank you for choosing Cesar Store / شكراً لتعاملك مع متجر سيزر.")
        ),
        React.createElement(Text, { style: { marginTop: 4 } }, "support@cesarstore.com")
      )
    )
  );

  const buffer = await pdf(document).toBuffer();

  return new Response(buffer as any, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename=invoice-${order.id}.pdf`,
    },
  });
}