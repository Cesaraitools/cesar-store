export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { CONTACT_EMAIL } from "@/lib/seo";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const A = {
  invoice: "فاتورة",
  print: "طباعة / حفظ PDF",
  customerDetails: "بيانات العميل",
  orderDetails: "تفاصيل الطلب",
  date: "التاريخ",
  currency: "العملة",
  item: "الصنف",
  qty: "الكمية",
  price: "السعر",
  total: "الإجمالي",
  thanks: "شكرًا لاختيارك متجر سيزر.",
  empty: "غير متوفر",
};

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

function getItemName(item: any) {
  return (
    [
      item?.name_ar,
      item?.name_en,
      item?.name,
      item?.product?.name_ar,
      item?.product?.name_en,
      item?.product?.name,
    ].find((value) => typeof value === "string" && value.trim().length > 0) || "-"
  );
}

function renderField(label: string, value: string | number | null | undefined) {
  const prefix = label ? `${label}:` : "";

  return `
    <div class="field">
      ${prefix ? `<span class="field-label">${escapeHtml(prefix)}</span>` : ""}
      <span class="field-value">${escapeHtml(value || A.empty)}</span>
    </div>
  `;
}

function renderInvoiceHtml(order: any, requestUrl: string) {
  const customer = order.customer_snapshot || {};
  const currency = order.currency || "EGP";
  const rawItems = Array.isArray(order.items_snapshot) ? order.items_snapshot : [];
  const rows = rawItems
    .map((item: any) => {
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
          <td>${escapeHtml(price)}</td>
          <td>${escapeHtml((price * quantity).toFixed(2))}</td>
        </tr>
      `;
    })
    .join("");

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(A.invoice)} - ${escapeHtml(order.id.slice(0, 8))}</title>
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
    html { direction: rtl; text-rendering: optimizeLegibility; -webkit-font-smoothing: antialiased; }
    body {
      margin: 0;
      background: #f8fafc;
      color: #0f172a;
      font-family: "CesarArabic", Tahoma, Arial, sans-serif;
      font-size: 13px;
      line-height: 1.8;
    }
    .print-bar { position: fixed; top: 16px; left: 16px; z-index: 10; }
    .print-button {
      border: 0;
      border-radius: 10px;
      background: #111827;
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
      padding-bottom: 22px;
      margin-bottom: 38px;
    }
    .brand { direction: ltr; text-align: left; }
    .brand-title { font-size: 28px; font-weight: 900; letter-spacing: 0; }
    .invoice-id { color: #475569; font-weight: 700; margin-top: 8px; }
    .logo-block { text-align: center; }
    .logo { width: 88px; height: auto; display: block; margin: 0 auto 8px; }
    .invoice-title { color: #0f172a; font-size: 16px; font-weight: 900; margin: 0; }
    .grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 26px;
      margin-bottom: 44px;
    }
    .section-title {
      color: #94a3b8;
      font-size: 12px;
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
    .field-value { color: #111827; font-weight: 600; white-space: pre-wrap; }
    table {
      border-collapse: collapse;
      direction: rtl;
      table-layout: fixed;
      width: 100%;
    }
    th,
    td {
      border-bottom: 1px solid #e2e8f0;
      padding: 14px 12px;
      text-align: center;
      vertical-align: middle;
      word-break: normal;
    }
    th {
      background: #f8fafc;
      color: #0f172a;
      font-weight: 900;
    }
    .item-cell {
      overflow-wrap: anywhere;
      text-align: right;
      unicode-bidi: plaintext;
      width: 48%;
    }
    .variant { color: #64748b; font-size: 11px; margin-top: 4px; }
    .summary {
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: flex-start;
      margin-top: 38px;
      padding-top: 18px;
    }
    .summary-box {
      min-width: 220px;
      display: flex;
      justify-content: space-between;
      gap: 18px;
      font-size: 16px;
      font-weight: 900;
    }
    .summary-value { color: #2563eb; direction: ltr; }
    .footer {
      border-top: 1px solid #f1f5f9;
      color: #94a3b8;
      direction: ltr;
      font-size: 10px;
      margin-top: 64px;
      overflow-wrap: anywhere;
      padding-top: 12px;
      text-align: center;
    }
    @media print {
      body { background: #fff; }
      .print-bar { display: none; }
      .sheet { box-shadow: none; margin: 0; min-height: auto; padding: 0; width: auto; }
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
        <div class="invoice-id">#${escapeHtml(order.id.slice(0, 8))}</div>
      </div>
      <div class="logo-block">
        <img class="logo" src="/logo-v2.png" alt="Cesar Store" />
        <h1 class="invoice-title">${escapeHtml(A.invoice)}</h1>
      </div>
    </header>
    <section class="grid">
      <div>
        <div class="section-title">${escapeHtml(A.customerDetails)}</div>
        ${renderField("", customer.name || "Customer")}
        ${renderField("", customer.phone || "")}
        ${renderField("", customer.address || "")}
      </div>
      <div>
        <div class="section-title">${escapeHtml(A.orderDetails)}</div>
        ${renderField(A.date, formatDate(order.created_at))}
        ${renderField(A.currency, currency)}
      </div>
    </section>
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
    <section class="summary">
      <div class="summary-box">
        <span>${escapeHtml(A.total)}</span>
        <span class="summary-value">${escapeHtml(order.total)} ${escapeHtml(currency)}</span>
      </div>
    </section>
    <footer class="footer">${escapeHtml(A.thanks)} ${escapeHtml(CONTACT_EMAIL)} - Printed ${escapeHtml(new Date().toLocaleString("en-GB"))} - ${escapeHtml(requestUrl)}</footer>
  </main>
</body>
</html>`;
}

export async function GET(req: Request, { params }: { params: { orderId: string } }) {
  const orderId = params.orderId;

  try {
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, created_at, currency, total, customer_snapshot, items_snapshot")
      .eq("id", orderId)
      .single();

    if (error || !order) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }

    return new Response(renderInvoiceHtml(order, req.url), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (err) {
    console.error("Invoice render error:", err);
    return Response.json({ error: "Failed to generate invoice" }, { status: 500 });
  }
}
