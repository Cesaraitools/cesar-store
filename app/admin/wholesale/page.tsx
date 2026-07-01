"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Store,
  Trash2,
  XCircle,
} from "lucide-react";
import type {
  WholesaleApplication,
  WholesaleApplicationStatus,
  WholesaleCustomerStatus,
} from "@/types/wholesale";

const statusLabels: Record<WholesaleApplicationStatus, string> = {
  pending: "جديد",
  under_review: "قيد المراجعة",
  approved: "تمت الموافقة",
  rejected: "مرفوض",
};

const statusClasses: Record<WholesaleApplicationStatus, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-100",
  under_review: "bg-blue-50 text-blue-700 border-blue-100",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-100",
  rejected: "bg-rose-50 text-rose-700 border-rose-100",
};

const statusActionClasses: Record<
  WholesaleApplicationStatus,
  { active: string; idle: string }
> = {
  pending: {
    active: "border-amber-500 bg-amber-500 text-white shadow-lg shadow-amber-100 ring-2 ring-amber-100",
    idle: "border-amber-100 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100",
  },
  under_review: {
    active: "border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-100 ring-2 ring-blue-100",
    idle: "border-blue-100 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100",
  },
  approved: {
    active: "border-emerald-600 bg-emerald-600 text-white shadow-lg shadow-emerald-100 ring-2 ring-emerald-100",
    idle: "border-emerald-100 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100",
  },
  rejected: {
    active: "border-rose-600 bg-rose-600 text-white shadow-lg shadow-rose-100 ring-2 ring-rose-100",
    idle: "border-rose-100 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100",
  },
};

function statusActionClass(
  currentStatus: WholesaleApplicationStatus,
  targetStatus: WholesaleApplicationStatus
) {
  const tone =
    currentStatus === targetStatus
      ? statusActionClasses[targetStatus].active
      : statusActionClasses[targetStatus].idle;

  return `inline-flex items-center justify-center gap-1 rounded-xl border px-4 py-3 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-70 ${tone}`;
}

const entityLabels = {
  shop: "محل",
  distributor: "موزع",
  company: "شركة",
  other: "أخرى",
};

const customerStatusLabels = {
  pending_account: "ملف العميل جاهز - بانتظار الحساب",
  active: "حساب الجملة نشط",
  suspended: "حساب الجملة موقوف",
};

type WholesaleResetInfo = {
  enabled: boolean;
  authorized: boolean;
  confirmation: string;
  summary: {
    applications: number;
    customers: number;
    carts: number;
    cartItems: number;
    orders: number;
    orderItems: number;
    returns: number;
    deductedOrders: number;
  } | null;
};

export default function AdminWholesalePage() {
  const [applications, setApplications] = useState<WholesaleApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetInfo, setResetInfo] = useState<WholesaleResetInfo | null>(null);
  const [resettingWholesale, setResettingWholesale] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | WholesaleApplicationStatus>(
    "all"
  );
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [accountUpdatingId, setAccountUpdatingId] = useState<string | null>(null);

  async function loadApplications(initial = false) {
    if (initial) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/wholesale/applications");
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر تحميل طلبات الانضمام للجملة");
      }

      setApplications(Array.isArray(payload?.applications) ? payload.applications : []);
    } catch {
      setError("فشل تحميل طلبات الجملة");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function loadResetInfo() {
    try {
      const response = await fetch("/api/admin/wholesale/reset", {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);

      if (response.ok && payload) {
        setResetInfo(payload);
      }
    } catch {
      setResetInfo(null);
    }
  }

  async function handleResetWholesaleTestData() {
    if (!resetInfo?.confirmation) return;

    const firstConfirmation = window.confirm(
      "سيتم حذف بيانات اختبار الجملة فقط: طلبات الانضمام، العملاء، السلة، طلبات الجملة، المرتجعات، ومستندات التقديم. لن يتم لمس منتجات أو مخزون أو طلبات القطاعي. هل تريد المتابعة؟"
    );

    if (!firstConfirmation) return;

    const typedConfirmation = window.prompt(
      `للتأكيد اكتب بالضبط: ${resetInfo.confirmation}`
    );

    if (typedConfirmation !== resetInfo.confirmation) {
      alert("تم إلغاء التصفير لأن عبارة التأكيد غير مطابقة.");
      return;
    }

    try {
      setResettingWholesale(true);

      const response = await fetch("/api/admin/wholesale/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: typedConfirmation }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر تصفير بيانات اختبار الجملة");
      }

      await Promise.all([loadApplications(false), loadResetInfo()]);

      alert(
        `تم تصفير بيانات اختبار الجملة بنجاح.\nطلبات الانضمام: ${payload.deleted.applications}\nالعملاء: ${payload.deleted.customers}\nطلبات الجملة: ${payload.deleted.orders}\nالملفات: ${payload.deleted.documents}`
      );
    } catch (resetError) {
      alert(
        resetError instanceof Error
          ? resetError.message
          : "تعذر تصفير بيانات اختبار الجملة"
      );
    } finally {
      setResettingWholesale(false);
    }
  }

  useEffect(() => {
    loadApplications(true);
    loadResetInfo();
  }, []);

  const filteredApplications = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return applications.filter((application) => {
      const matchesStatus =
        statusFilter === "all" || application.status === statusFilter;
      const haystack = [
        application.businessName,
        application.contactName,
        application.phone,
        application.whatsapp,
        application.governorate,
        application.city,
      ]
        .join(" ")
        .toLowerCase();

      return matchesStatus && (!normalizedQuery || haystack.includes(normalizedQuery));
    });
  }, [applications, query, statusFilter]);

  async function updateStatus(
    application: WholesaleApplication,
    status: WholesaleApplicationStatus
  ) {
    const reviewNotes =
      status === "rejected"
        ? window.prompt("سبب الرفض أو ملاحظات المراجعة") || ""
        : "";

    try {
      setUpdatingId(application.id);
      const response = await fetch(
        `/api/admin/wholesale/applications/${application.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, reviewNotes }),
        }
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر تحديث حالة طلب الجملة");
      }

      setApplications((current) =>
        current.map((item) =>
          item.id === application.id ? payload.application : item
        )
      );
    } catch (statusError) {
      console.error("Wholesale status update failed", statusError);
      alert(
        statusError instanceof Error
          ? statusError.message
          : "تعذر تحديث حالة الطلب"
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function updateWholesaleCustomer(
    application: WholesaleApplication,
    input:
      | { action: "link"; accountEmail: string }
      | { action: "status"; status: WholesaleCustomerStatus }
  ) {
    try {
      setAccountUpdatingId(application.id);
      const response = await fetch(
        `/api/admin/wholesale/applications/${application.id}/account`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        }
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر تحديث حساب الجملة");
      }

      setApplications((current) =>
        current.map((item) =>
          item.id === application.id
            ? { ...item, wholesaleCustomer: payload.wholesaleCustomer }
            : item
        )
      );
    } catch (accountError) {
      console.error("Wholesale account update failed", accountError);
      alert(
        accountError instanceof Error
          ? accountError.message
          : "تعذر تحديث حساب الجملة"
      );
    } finally {
      setAccountUpdatingId(null);
    }
  }

  function linkWholesaleCustomer(application: WholesaleApplication) {
    if (!application.email) {
      alert(
        "هذا الطلب لا يحتوي على بريد إلكتروني. اطلب من العميل تقديم طلب جديد بالبريد الذي سيستخدمه لتسجيل الدخول."
      );
      return;
    }

    const accountEmail = window.prompt(
      "أدخل بريد حساب العميل المسجل على الموقع",
      application.email
    );

    if (!accountEmail) return;

    updateWholesaleCustomer(application, {
      action: "link",
      accountEmail,
    });
  }

  async function openDocument(path: string) {
    const documentWindow = window.open("", "_blank");

    if (!documentWindow) {
      alert("المتصفح منع فتح المستند. اسمح بالنوافذ المنبثقة لهذه الصفحة ثم حاول مرة أخرى.");
      return;
    }

    documentWindow.document.title = "جار فتح المستند";
    documentWindow.document.body.innerHTML =
      "<p style='font-family: sans-serif; padding: 24px; direction: rtl;'>جار فتح المستند...</p>";

    try {
      const response = await fetch(
        `/api/admin/wholesale/documents?path=${encodeURIComponent(path)}`
      );
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.url) {
        documentWindow.close();
        alert("تعذر فتح المستند");
        return;
      }

      documentWindow.location.href = payload.url;
    } catch {
      documentWindow.close();
      alert("تعذر فتح المستند");
    }
  }

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-950">طلبات الجملة</h1>
          <p className="mt-2 text-sm text-slate-500">
            مراجعة طلبات اعتماد تجار الجملة والمستندات الرسمية.
          </p>
        </div>
        <button
          onClick={() => loadApplications(false)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:border-blue-300 hover:text-blue-700 disabled:opacity-60"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          تحديث
        </button>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[1fr_220px]">
        <label className="relative block">
          <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="بحث باسم الكيان أو المسؤول أو الهاتف"
            className="field-input pr-11"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as "all" | WholesaleApplicationStatus)
          }
          className="field-input"
        >
          <option value="all">كل الحالات</option>
          <option value="pending">جديد</option>
          <option value="under_review">قيد المراجعة</option>
          <option value="approved">تمت الموافقة</option>
          <option value="rejected">مرفوض</option>
        </select>
      </div>

      {resetInfo?.enabled && resetInfo.authorized && resetInfo.summary ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-amber-700" />
              <div>
                <h2 className="text-sm font-black text-amber-900">
                  تصفير بيانات اختبار الجملة
                </h2>
                <p className="mt-1 text-sm font-bold leading-6 text-amber-800">
                  هذا الإجراء مخصص بعد اختبار الإطلاق فقط. يحذف بيانات الجملة
                  التجريبية ومستنداتها، ولا يلمس منتجات أو مخزون أو طلبات
                  القطاعي.
                </p>
                {resetInfo.summary.deductedOrders > 0 ? (
                  <p className="mt-2 rounded-xl border border-rose-200 bg-white px-3 py-2 text-xs font-black text-rose-700">
                    التصفير متوقف الآن لأن هناك{" "}
                    {resetInfo.summary.deductedOrders.toLocaleString("ar-EG")}{" "}
                    طلب جملة خصم من المخزون ولم يتم إرجاعه.
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-black text-amber-900">
                  <span className="rounded-full bg-white px-3 py-1">
                    طلبات انضمام: {resetInfo.summary.applications.toLocaleString("ar-EG")}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1">
                    عملاء: {resetInfo.summary.customers.toLocaleString("ar-EG")}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1">
                    طلبات: {resetInfo.summary.orders.toLocaleString("ar-EG")}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1">
                    سلة: {resetInfo.summary.cartItems.toLocaleString("ar-EG")}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetWholesaleTestData}
              disabled={resettingWholesale || resetInfo.summary.deductedOrders > 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-black text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resettingWholesale ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              {resettingWholesale
                ? "جارٍ تصفير بيانات الجملة..."
                : "تصفير بيانات اختبار الجملة"}
            </button>
          </div>
        </section>
      ) : null}

      {error && (
        <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-80 items-center justify-center rounded-2xl border border-slate-200 bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <Store className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-4 text-xl font-black text-slate-800">
            لا توجد طلبات مطابقة
          </h2>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map((application) => (
            <article
              key={application.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-black text-slate-950">
                      {application.businessName}
                    </h2>
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-black ${statusClasses[application.status]}`}
                    >
                      {statusLabels[application.status]}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                      {entityLabels[application.entityType] || "أخرى"}
                    </span>
                    {application.wholesaleCustomer && (
                      <span className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                        {customerStatusLabels[
                          application.wholesaleCustomer.status
                        ] || "ملف عميل الجملة جاهز"}
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-500">
                    {application.contactName} - {application.governorate} /{" "}
                    {application.city}
                  </p>
                </div>

                <div className="flex w-full flex-col gap-3 lg:w-auto">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-black text-slate-500">
                      تغيير حالة الطلب
                    </div>
                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] font-black ${statusClasses[application.status]}`}
                    >
                      الحالة الحالية: {statusLabels[application.status]}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => updateStatus(application, "under_review")}
                      disabled={updatingId === application.id}
                      aria-pressed={application.status === "under_review"}
                      className={statusActionClass(application.status, "under_review")}
                    >
                      قيد المراجعة
                    </button>
                    <button
                      onClick={() => updateStatus(application, "approved")}
                      disabled={updatingId === application.id}
                      aria-pressed={application.status === "approved"}
                      className={statusActionClass(application.status, "approved")}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      موافقة
                    </button>
                    <button
                      onClick={() => updateStatus(application, "rejected")}
                      disabled={updatingId === application.id}
                      aria-pressed={application.status === "rejected"}
                      className={statusActionClass(application.status, "rejected")}
                    >
                      <XCircle className="h-4 w-4" />
                      رفض
                    </button>
                  </div>
                </div>

                {application.status === "approved" && application.wholesaleCustomer && (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs font-black text-emerald-700">
                        حساب الجملة
                      </div>
                      <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-[11px] font-black text-emerald-700">
                        {customerStatusLabels[
                          application.wholesaleCustomer.status
                        ] || "ملف عميل الجملة جاهز"}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        const isLinked = Boolean(
                          application.wholesaleCustomer.authUserId
                        );
                        const isActive =
                          application.wholesaleCustomer.status === "active";
                        const toggleStatus: WholesaleCustomerStatus = isActive
                          ? "suspended"
                          : "active";
                        const toggleLabel = isActive
                          ? "إيقاف الحساب"
                          : "إعادة التفعيل";
                        const toggleDisabled =
                          accountUpdatingId === application.id || !isLinked;

                        return (
                          <>
                      <button
                        onClick={() => linkWholesaleCustomer(application)}
                        disabled={
                          accountUpdatingId === application.id ||
                          !application.email ||
                          isLinked
                        }
                        title={
                          isLinked
                            ? "تم ربط هذا الحساب بالفعل. استخدم زر إيقاف الحساب أو إعادة التفعيل لإدارة الحالة."
                            : undefined
                        }
                        className="inline-flex items-center justify-center gap-1 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-xs font-black text-emerald-700 transition hover:border-emerald-400 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {accountUpdatingId === application.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        {isLinked ? "تم ربط وتفعيل الحساب" : "ربط وتفعيل الحساب"}
                      </button>
                        <button
                          onClick={() =>
                            updateWholesaleCustomer(application, {
                              action: "status",
                              status: toggleStatus,
                            })
                          }
                          disabled={toggleDisabled}
                          title={
                            !isLinked
                              ? "يجب ربط وتفعيل الحساب أولًا قبل إيقافه أو إعادة تفعيله."
                              : undefined
                          }
                          className={`inline-flex items-center justify-center gap-1 rounded-xl border bg-white px-4 py-3 text-xs font-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
                            isActive
                              ? "border-rose-200 text-rose-700 hover:border-rose-400 hover:bg-rose-50"
                              : "border-blue-200 text-blue-700 hover:border-blue-400 hover:bg-blue-50"
                          }`}
                        >
                          {isActive ? (
                            <XCircle className="h-4 w-4" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          {toggleLabel}
                        </button>
                          </>
                        );
                      })()}
                    </div>
                    {application.wholesaleCustomer.authUserId && (
                      <div className="mt-3 break-all rounded-xl bg-white px-3 py-2 text-[11px] font-bold text-emerald-700" dir="ltr">
                        {application.wholesaleCustomer.authUserId}
                      </div>
                    )}
                    <p className="mt-3 text-xs font-bold leading-6 text-emerald-800">
                      يتم الربط بالبريد المسجل في طلب الجملة:{" "}
                      <span dir="ltr" className="inline-block break-all">
                        {application.email || "غير مضاف في هذا الطلب"}
                      </span>
                    </p>
                  </div>
                )}
                </div>
              </div>

              <div className="mt-5 grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-4">
                <Info label="الهاتف" value={application.phone} />
                <Info label="واتساب" value={application.whatsapp} />
                <Info label="البريد" value={application.email || "غير مضاف"} />
                <Info
                  label="تاريخ الطلب"
                  value={new Date(application.createdAt).toLocaleString("ar-EG")}
                />
                <Info label="الرقم الضريبي" value={application.taxNumber || "-"} />
                <Info
                  label="السجل التجاري"
                  value={application.commercialRegisterNumber || "-"}
                />
                <Info
                  label="العنوان"
                  value={application.address || "-"}
                  wide
                />
              </div>

              {application.notes && (
                <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                  {application.notes}
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                {application.documents.map((document) => (
                  <button
                    key={document.storagePath}
                    onClick={() => openDocument(document.storagePath)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 transition hover:border-blue-300 hover:text-blue-700"
                  >
                    <FileText className="h-4 w-4" />
                    {document.label}
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function Info({
  label,
  value,
  wide,
}: {
  label: string;
  value: string;
  wide?: boolean;
}) {
  return (
    <div className={`rounded-xl bg-slate-50 p-3 ${wide ? "lg:col-span-2" : ""}`}>
      <div className="text-[11px] font-black text-slate-400">{label}</div>
      <div className="mt-1 break-words text-sm font-bold text-slate-800">{value}</div>
    </div>
  );
}
