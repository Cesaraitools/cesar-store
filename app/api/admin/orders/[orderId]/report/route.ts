export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin/permissions";
import { createServiceRoleClient } from "@/lib/supabase/runtime";

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
  print: "\u0637\u0628\u0627\u0639\u0629 \u0627\u0644\u062a\u0642\u0631\u064a\u0631",
  empty: "\u063a\u064a\u0631 \u0645\u062a\u0648\u0641\u0631",
};

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

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString("en-GB") : A.empty;
}

function reportField(label: string, value: string | number | null | undefined) {
  return `
    <div class="field">
      <span class="field-label">${escapeHtml(label)}:</span>
      <span class="field-value">${escapeHtml(value || A.empty)}</span>
    </div>
  `;
}

function renderPrintableOrderReport(params: {
  order: any;
  customer: any;
  items: any[];
  qrDataUrl: string;
  trackingUrl: string;
}) {
  const { order, customer, items, qrDataUrl, trackingUrl } = params;
  const currency = order.currency || "EGP";
  const rows = items
    .map((item) => {
      const price = Number(item?.price || 0);
      const quantity = Number(item?.quantity || 0);
      const variantText = getItemVariantText(item);

      return `
        <tr>
          <td class="item-cell">
            <div>${escapeHtml(getItemName(item))}</div>
            ${variantText ? `<div class="variant">${escapeHtml(variantText)}</div>` : ""}
          </td>
          <td>${escapeHtml(quantity)}</td>
          <td>${escapeHtml(`${price} ${currency}`)}</td>
          <td>${escapeHtml(`${price * quantity} ${currency}`)}</td>
        </tr>
      `;
    })
    .join("");

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(A.reportTitle)} - ${escapeHtml(order.order_number || order.id)}</title>
  <style>
    @font-face {
      font-family: "CesarArabic";
      src: url("/fonts/NotoSansArabic-Regular.ttf") format("truetype");
      font-weight: 400 900;
      font-style: normal;
      font-display: swap;
    }
    @page { size: A4; margin: 12mm; }
    * { box-sizing: border-box; }
    html {
      direction: rtl;
      text-rendering: optimizeLegibility;
      -webkit-font-smoothing: antialiased;
    }
    body {
      margin: 0;
      background: #f8fafc;
      color: #0f172a;
      font-family: "CesarArabic", Tahoma, Arial, sans-serif;
      font-size: 13px;
      line-height: 1.8;
    }
    .print-bar {
      position: fixed;
      top: 16px;
      left: 16px;
      z-index: 10;
    }
    .print-button {
      border: 0;
      border-radius: 10px;
      background: #2563eb;
      color: #fff;
      cursor: pointer;
      font: inherit;
      font-weight: 800;
      padding: 10px 16px;
      box-shadow: 0 8px 20px rgba(37, 99, 235, 0.2);
    }
    .sheet {
      width: 190mm;
      min-height: 270mm;
      margin: 18px auto;
      padding: 12mm;
      background: #fff;
      border-radius: 18px;
      box-shadow: 0 14px 38px rgba(15, 23, 42, 0.08);
    }
    .header {
      direction: ltr;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 24px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 18px;
      margin-bottom: 18px;
    }
    .brand { direction: ltr; text-align: left; }
    .brand-title { font-size: 24px; font-weight: 900; letter-spacing: 0; }
    .order-short { color: #475569; font-weight: 700; margin-top: 4px; }
    .report-title {
      direction: rtl;
      color: #2563eb;
      font-size: 22px;
      font-weight: 900;
      margin: 0;
      text-align: right;
    }
    .grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 150px;
      gap: 16px;
      align-items: stretch;
      margin-bottom: 24px;
    }
    .card {
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 16px;
      min-height: 150px;
    }
    .card-title {
      color: #2563eb;
      font-size: 16px;
      font-weight: 900;
      margin-bottom: 12px;
      text-align: right;
    }
    .field {
      display: block;
      margin-bottom: 8px;
      overflow-wrap: anywhere;
      text-align: right;
      unicode-bidi: plaintext;
    }
    .field-label { color: #0f172a; font-weight: 900; }
    .field-value {
      color: #111827;
      font-weight: 600;
      white-space: pre-wrap;
    }
    .qr-card {
      align-items: center;
      display: flex;
      flex-direction: column;
      justify-content: center;
      text-align: center;
    }
    .qr-card img { height: 118px; width: 118px; }
    .qr-note {
      color: #475569;
      font-size: 11px;
      line-height: 1.7;
      margin-top: 8px;
    }
    .section-title {
      color: #2563eb;
      font-size: 18px;
      font-weight: 900;
      margin: 0 0 12px;
      text-align: right;
    }
    table {
      border: 1px solid #e2e8f0;
      border-collapse: separate;
      border-radius: 14px;
      border-spacing: 0;
      direction: rtl;
      overflow: hidden;
      table-layout: fixed;
      width: 100%;
    }
    th,
    td {
      border-bottom: 1px solid #f1f5f9;
      padding: 12px;
      text-align: center;
      vertical-align: middle;
      word-break: normal;
    }
    th {
      background: #f8fafc;
      color: #0f172a;
      font-weight: 900;
    }
    tr:last-child td { border-bottom: 0; }
    .item-cell {
      overflow-wrap: anywhere;
      text-align: right;
      unicode-bidi: plaintext;
      width: 46%;
    }
    .variant {
      color: #475569;
      font-size: 11px;
      margin-top: 4px;
    }
    .total-box {
      background: #eff6ff;
      border: 1px solid #dbeafe;
      border-radius: 12px;
      color: #0f172a;
      display: inline-block;
      font-size: 15px;
      font-weight: 900;
      margin-top: 18px;
      min-width: 190px;
      padding: 14px 18px;
      text-align: right;
    }
    .footer {
      border-top: 1px solid #f1f5f9;
      color: #94a3b8;
      direction: ltr;
      font-size: 10px;
      margin-top: 48px;
      overflow-wrap: anywhere;
      padding-top: 10px;
      text-align: center;
    }
    @media print {
      body { background: #fff; }
      .print-bar { display: none; }
      .sheet {
        box-shadow: none;
        margin: 0;
        min-height: auto;
        padding: 0;
        width: auto;
      }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <button class="print-button" type="button" onclick="window.print()">${escapeHtml(A.print)}</button>
  </div>
  <main class="sheet">
    <header class="header">
      <div class="brand">
        <div class="brand-title">CESAR STORE</div>
        <div class="order-short">Order ${escapeHtml(order.order_number || order.id.slice(0, 8))}</div>
      </div>
      <h1 class="report-title">${escapeHtml(A.reportTitle)}</h1>
    </header>
    <section class="grid">
      <div class="card">
        <div class="card-title">${escapeHtml(A.customerInfo)}</div>
        ${reportField(A.name, customer.name || A.empty)}
        ${reportField(A.phone, customer.phone || "-")}
        ${reportField(A.address, customer.address || A.empty)}
        ${reportField(A.email, customer.email || "-")}
      </div>
      <div class="card">
        <div class="card-title">${escapeHtml(A.orderInfo)}</div>
        ${reportField(A.orderNumber, order.order_number || order.id)}
        ${reportField(A.date, formatDate(order.created_at))}
        ${reportField(A.status, order.status || "requested")}
      </div>
      <div class="card qr-card">
        <img src="${escapeHtml(qrDataUrl)}" alt="${escapeHtml(A.qrNote)}" />
        <div class="qr-note">${escapeHtml(A.qrNote)}</div>
      </div>
    </section>
    <section>
      <h2 class="section-title">${escapeHtml(A.products)}</h2>
      <table>
        <thead>
          <tr>
            <th class="item-cell">${escapeHtml(A.item)}</th>
            <th>${escapeHtml(A.qty)}</th>
            <th>${escapeHtml(A.price)}</th>
            <th>${escapeHtml(A.total)}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
    <div class="total-box">${escapeHtml(A.total)}: ${escapeHtml(order.total)} ${escapeHtml(currency)}</div>
    <footer class="footer">Printed ${escapeHtml(new Date().toLocaleString("en-GB"))} - ${escapeHtml(trackingUrl)}</footer>
  </main>
</body>
</html>`;
}

export async function GET(
  request: Request,
  { params }: { params: { orderId: string } }
) {
  try {
    const guard = await requireAdminRole(["full", "orders"]);
    if (guard.response) return guard.response;

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

    const html = renderPrintableOrderReport({
      order,
      customer,
      items,
      qrDataUrl,
      trackingUrl,
    });

    return new Response(html, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("Admin order report render error:", error);
    return NextResponse.json(
      { error: "Failed to generate order report" },
      { status: 500 }
    );
  }
}
