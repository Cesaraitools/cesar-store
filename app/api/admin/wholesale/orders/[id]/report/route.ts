export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { requireAdminRole } from "@/lib/admin/permissions";
import { formatVariantSnapshot } from "@/lib/product-variants";
import { getWholesaleOrderById } from "@/lib/server/wholesale-orders";
import type { WholesaleOrder, WholesaleOrderItem, WholesaleOrderStatus } from "@/types/wholesale";

const R = {
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
  qrNote: "امسح الكود وسجل الدخول بنفس حساب عميل الجملة لمتابعة الطلب",
  print: "طباعة التقرير",
  empty: "غير متوفر",
};

const readableStatusLabels: Record<WholesaleOrderStatus, string> = {
  requested: "تم الاستلام",
  confirmed: "تم التأكيد",
  preparing: "جاري التحضير",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  canceled: "ملغي",
};

function formatMoney(value: number, currency = "EGP") {
  return `${Number(value || 0).toLocaleString("ar-EG")} ${currency}`;
}

function normalizePhone(value: unknown) {
  const digits = String(value || "").replace(/\D/g, "");

  if (!digits) return "";
  if (digits.startsWith("20")) return `0${digits.slice(2)}`;

  return digits;
}

function getWholesaleTrackingUrl(request: Request, order: WholesaleOrder) {
  const requestUrl = new URL(request.url);
  const rawBaseUrl = process.env.NEXT_PUBLIC_SITE_URL || requestUrl.origin;
  const baseUrl = rawBaseUrl.replace(/\/+$/, "");
  const orderIdentifier = order.orderNumber || order.id;
  const customerPhone =
    normalizePhone(order.customerSnapshot?.phone) ||
    normalizePhone(order.customerSnapshot?.whatsapp);
  const trackingPath = new URL("/wholesale/status", baseUrl);
  trackingPath.searchParams.set("id", orderIdentifier);

  if (customerPhone) {
    trackingPath.searchParams.set("phone", customerPhone);
  }

  const redirect = `${trackingPath.pathname}${trackingPath.search}`;

  return `${baseUrl}/auth/login?redirect=${encodeURIComponent(redirect)}`;
}

function customerText(order: WholesaleOrder, field: string) {
  const value = order.customerSnapshot?.[field];
  return typeof value === "string" && value.trim() ? value.trim() : R.empty;
}

function itemName(item: WholesaleOrderItem) {
  return item.productNameAr || item.productNameEn || R.empty;
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

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function readableFormatDate(value: string | null | undefined) {
  if (!value) return R.empty;

  try {
    return new Intl.DateTimeFormat("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function readableQuantity(value: number) {
  return `${Number(value || 0).toLocaleString("ar-EG")} قطعة`;
}

function renderField(label: string, value: string | number | null | undefined) {
  return `
    <div class="field">
      <span class="field-label">${escapeHtml(label)}:</span>
      <span class="field-value">${escapeHtml(value || R.empty)}</span>
    </div>
  `;
}

function renderWholesaleOrderReportHtml(params: {
  order: WholesaleOrder;
  qrDataUrl: string;
  trackingUrl: string;
}) {
  const { order, qrDataUrl, trackingUrl } = params;
  const rows = order.items
    .map((item) => {
      const returned = item.returnedUnits || 0;
      const remaining = Math.max(0, item.orderedUnits - returned);
      const variant = itemVariant(item);

      return `
        <tr>
          <td class="item-cell">
            <div>${escapeHtml(itemName(item))}</div>
            ${variant ? `<div class="variant">${escapeHtml(variant)}</div>` : ""}
          </td>
          <td>${escapeHtml(readableQuantity(item.minOrderUnits))}</td>
          <td>${escapeHtml(readableQuantity(item.orderedUnits))}</td>
          <td>${escapeHtml(formatMoney(item.unitPrice, order.currency))}</td>
          <td>${escapeHtml(readableQuantity(returned))}</td>
          <td>${escapeHtml(readableQuantity(remaining))}</td>
          <td>${escapeHtml(formatMoney(item.lineTotal, order.currency))}</td>
        </tr>
      `;
    })
    .join("");

  const printedAt = readableFormatDate(new Date().toISOString());
  const status = readableStatusLabels[order.status] || order.status;

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(R.reportTitle)} - ${escapeHtml(order.orderNumber || order.id)}</title>
  <style>
    @font-face {
      font-family: "CesarArabic";
      src: url("/fonts/NotoSansArabic-Regular.ttf") format("truetype");
      font-weight: 400 900;
      font-style: normal;
      font-display: swap;
    }
    @page { size: A4; margin: 10mm; }
    * { box-sizing: border-box; }
    html { direction: rtl; text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased; }
    body {
      margin: 0;
      background: #f8fafc;
      color: #0f172a;
      font-family: "CesarArabic", Tahoma, Arial, sans-serif;
      font-size: 12px;
      line-height: 1.75;
    }
    .print-bar { position: fixed; top: 16px; left: 16px; z-index: 10; }
    .print-button {
      border: 0;
      border-radius: 10px;
      background: #2563eb;
      color: #fff;
      cursor: pointer;
      font: inherit;
      font-weight: 800;
      padding: 10px 16px;
    }
    .sheet {
      width: 190mm;
      min-height: 270mm;
      margin: 18px auto;
      padding: 10mm;
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
      padding-bottom: 16px;
      margin-bottom: 16px;
    }
    .brand { direction: ltr; text-align: left; }
    .brand-title { font-size: 24px; font-weight: 900; letter-spacing: 0; }
    .report-title {
      direction: rtl;
      color: #2563eb;
      font-size: 22px;
      font-weight: 900;
      margin: 0;
      text-align: right;
    }
    .status { color: #475569; font-weight: 800; margin-top: 4px; text-align: right; }
    .grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 140px;
      gap: 14px;
      margin-bottom: 18px;
    }
    .card {
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      padding: 14px;
      min-height: 142px;
    }
    .card-title {
      color: #0f172a;
      font-size: 15px;
      font-weight: 900;
      margin-bottom: 10px;
      text-align: right;
    }
    .field {
      display: block;
      margin-bottom: 6px;
      overflow-wrap: anywhere;
      text-align: right;
      unicode-bidi: plaintext;
    }
    .field-label { color: #64748b; font-weight: 900; }
    .field-value { color: #111827; font-weight: 800; white-space: pre-wrap; }
    .qr-card {
      align-items: center;
      display: flex;
      flex-direction: column;
      justify-content: center;
      text-align: center;
    }
    .qr-card img { height: 106px; width: 106px; }
    .qr-note { color: #475569; font-size: 10px; line-height: 1.7; margin-top: 8px; }
    .notes {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-radius: 12px;
      color: #92400e;
      font-weight: 800;
      margin-bottom: 16px;
      padding: 10px 12px;
      text-align: right;
      white-space: pre-wrap;
      unicode-bidi: plaintext;
    }
    .section-title {
      color: #2563eb;
      font-size: 17px;
      font-weight: 900;
      margin: 0 0 10px;
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
      padding: 9px 8px;
      text-align: center;
      vertical-align: middle;
      word-break: normal;
    }
    th {
      background: #eff6ff;
      color: #1d4ed8;
      font-weight: 900;
    }
    tr:last-child td { border-bottom: 0; }
    .item-cell {
      overflow-wrap: anywhere;
      text-align: right;
      unicode-bidi: plaintext;
      width: 30%;
    }
    .variant { color: #c2410c; font-size: 10px; margin-top: 4px; }
    .total-box {
      background: #ecfdf5;
      border: 1px solid #bbf7d0;
      border-radius: 12px;
      color: #064e3b;
      display: inline-block;
      font-size: 16px;
      font-weight: 900;
      margin-top: 16px;
      min-width: 220px;
      padding: 12px 16px;
      text-align: right;
    }
    .footer {
      border-top: 1px solid #f1f5f9;
      color: #64748b;
      direction: ltr;
      font-size: 10px;
      margin-top: 34px;
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
    <button class="print-button" type="button" onclick="window.print()">${escapeHtml(R.print)}</button>
  </div>
  <main class="sheet">
    <header class="header">
      <div class="brand">
        <div class="brand-title">CESAR STORE</div>
        <div class="status">${escapeHtml(readableFormatDate(order.createdAt))}</div>
      </div>
      <div>
        <h1 class="report-title">${escapeHtml(R.reportTitle)}</h1>
        <div class="status">${escapeHtml(status)}</div>
      </div>
    </header>
    <section class="grid">
      <div class="card">
        <div class="card-title">${escapeHtml(R.customerInfo)}</div>
        ${renderField(R.businessName, customerText(order, "businessName"))}
        ${renderField(R.contactName, customerText(order, "contactName"))}
        ${renderField(R.phone, customerText(order, "phone"))}
        ${renderField(R.whatsapp, customerText(order, "whatsapp"))}
        ${renderField(R.city, `${customerText(order, "governorate")} / ${customerText(order, "city")}`)}
        ${renderField(R.address, customerText(order, "address"))}
      </div>
      <div class="card">
        <div class="card-title">${escapeHtml(R.orderInfo)}</div>
        ${renderField(R.orderNumber, order.orderNumber || order.id)}
        ${renderField(R.date, readableFormatDate(order.createdAt))}
        ${renderField(R.status, status)}
        ${renderField(R.total, formatMoney(order.subtotal, order.currency))}
        ${renderField(R.printedAt, printedAt)}
      </div>
      <div class="card qr-card">
        <img src="${escapeHtml(qrDataUrl)}" alt="${escapeHtml(R.qrNote)}" />
        <div class="qr-note">${escapeHtml(R.qrNote)}</div>
      </div>
    </section>
    ${order.notes ? `<div class="notes">${escapeHtml(`${R.notes}: ${order.notes}`)}</div>` : ""}
    <section>
      <h2 class="section-title">${escapeHtml(R.products)}</h2>
      <table>
        <thead>
          <tr>
            <th class="item-cell">${escapeHtml(R.item)}</th>
            <th>${escapeHtml(R.minQty)}</th>
            <th>${escapeHtml(R.qty)}</th>
            <th>${escapeHtml(R.price)}</th>
            <th>${escapeHtml(R.returned)}</th>
            <th>${escapeHtml(R.remaining)}</th>
            <th>${escapeHtml(R.total)}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>
    <div class="total-box">${escapeHtml(R.grandTotal)}: ${escapeHtml(formatMoney(order.subtotal, order.currency))}</div>
    <footer class="footer">${escapeHtml(R.brand)} - ${escapeHtml(R.printedAt)}: ${escapeHtml(printedAt)} - ${escapeHtml(trackingUrl)}</footer>
  </main>
</body>
</html>`;
}

export async function GET(
  request: Request,
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

    const trackingUrl = getWholesaleTrackingUrl(request, order);
    const qrDataUrl = await QRCode.toDataURL(trackingUrl, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 320,
    });
    const html = renderWholesaleOrderReportHtml({
      order,
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
