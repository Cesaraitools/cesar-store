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
} from "@react-pdf/renderer";
import { CONTACT_EMAIL } from "@/lib/seo";
import { pdfText, registerPdfFonts } from "@/lib/server/pdf-arabic";

registerPdfFonts();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function getItemVariantText(item: any) {
  const variant = item?.variant || item?.variant_snapshot || null;
  if (!variant || typeof variant !== "object") return "";

  const labelAr = typeof variant.label_ar === "string" ? variant.label_ar.trim() : "";
  const labelEn = typeof variant.label_en === "string" ? variant.label_en.trim() : "";
  if (labelAr || labelEn) return labelAr || labelEn;

  if (!Array.isArray(variant.selected_options)) return "";

  return variant.selected_options
    .map((option: any) => {
      const optionName =
        (typeof option?.option_name_ar === "string" && option.option_name_ar.trim()) ||
        (typeof option?.option_name_en === "string" && option.option_name_en.trim());
      const value =
        (typeof option?.value_ar === "string" && option.value_ar.trim()) ||
        (typeof option?.value_en === "string" && option.value_en.trim());

      return optionName && value ? `${optionName}: ${value}` : "";
    })
    .filter(Boolean)
    .join(" - ");
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
    padding: 50,
    fontSize: 10,
    color: "#334155",
    backgroundColor: "#FFFFFF",
    fontFamily: "Cairo",
    direction: "rtl",
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
    direction: "ltr",
  },
  rightHeaderSection: {
    alignItems: "flex-end",
    direction: "rtl",
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
  infoBlockRight: {
    width: "45%",
    alignItems: "flex-end",
    direction: "rtl",
  },
  muted: {
    color: "#94A3B8",
    fontSize: 8,
    direction: "rtl",
  },
  tableHeader: {
    flexDirection: "row-reverse",
    backgroundColor: "#F8FAFC",
    borderBottom: "1 solid #E2E8F0",
    padding: 10,
  },
  tableRow: {
    flexDirection: "row-reverse",
    borderBottom: "1 solid #F1F5F9",
    padding: 10,
    alignItems: "center",
  },
  colDescription: { width: "50%", textAlign: "right", direction: "rtl" },
  itemVariant: {
    marginTop: 3,
    color: "#64748B",
    fontSize: 8,
    textAlign: "right",
    direction: "rtl",
  },
  colQty: { width: "15%", textAlign: "center" },
  colPrice: { width: "15%", textAlign: "center" },
  colAmount: { width: "20%", textAlign: "center" },
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
    direction: "rtl",
  },
});

export async function GET(_req: Request, { params }: { params: { orderId: string } }) {
  const orderId = params.orderId;
  const logoUrl = "https://www.cesareshop.com/logo-v2.png";

  try {
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, created_at, currency, total, customer_snapshot, items_snapshot")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }

    const customer = order.customer_snapshot || {};
    const rawItems = Array.isArray(order.items_snapshot) ? order.items_snapshot : [];
    const items = rawItems.map((item: any) => ({
      name:
        [
          item?.name_ar,
          item?.name_en,
          item?.name,
          item?.product?.name_ar,
          item?.product?.name_en,
          item?.product?.name,
        ].find((value) => typeof value === "string" && value.trim().length > 0) || "-",
      price: Number(item?.price || 0),
      quantity: Number(item?.quantity || 0),
      variantText: getItemVariantText(item),
    }));

    const document = React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        { size: "A4", style: styles.page },
        React.createElement(
          View,
          { style: styles.brandHeader },
          React.createElement(Text, { style: styles.brandName }, "CESAR STORE"),
          React.createElement(
            View,
            { style: styles.rightHeaderSection },
            React.createElement(Image, { style: styles.logo, src: logoUrl }),
            React.createElement(Text, null, pdfText("فاتورة")),
            React.createElement(Text, { style: { fontSize: 9 } }, `#${order.id.slice(0, 8)}`)
          )
        ),
        React.createElement(
          View,
          { style: styles.infoGrid },
          React.createElement(
            View,
            { style: styles.infoBlock },
            React.createElement(Text, { style: styles.muted }, pdfText("بيانات العميل")),
            React.createElement(
              Text,
              { style: { fontWeight: 700, direction: "rtl" } },
              pdfText(customer.name || "Customer")
            ),
            React.createElement(Text, null, customer.phone || ""),
            React.createElement(Text, null, pdfText(customer.address || ""))
          ),
          React.createElement(
            View,
            { style: styles.infoBlockRight },
            React.createElement(Text, { style: styles.muted }, pdfText("تفاصيل الطلب")),
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
            React.createElement(Text, { style: styles.colDescription }, pdfText("الصنف")),
            React.createElement(Text, { style: styles.colQty }, pdfText("الكمية")),
            React.createElement(Text, { style: styles.colPrice }, pdfText("السعر")),
            React.createElement(Text, { style: styles.colAmount }, pdfText("الإجمالي"))
          ),
          ...items.map((item: any, index: number) =>
            React.createElement(
              View,
              { key: `${index}-${item.name}`, style: styles.tableRow },
              React.createElement(
                View,
                { style: styles.colDescription },
                React.createElement(Text, null, pdfText(item.name)),
                item.variantText
                  ? React.createElement(Text, { style: styles.itemVariant }, pdfText(item.variantText))
                  : null
              ),
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
              React.createElement(Text, null, pdfText("الإجمالي")),
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
          React.createElement(Text, null, pdfText("شكرًا لاختيارك متجر سيزر.")),
          React.createElement(Text, { style: { marginTop: 4 } }, CONTACT_EMAIL)
        )
      )
    );

    const buffer = await renderPdfBuffer(document);

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=invoice-${order.id}.pdf`,
      },
    });
  } catch (err) {
    console.error("Invoice PDF Error:", err);
    return Response.json({ error: "Failed to generate invoice" }, { status: 500 });
  }
}
