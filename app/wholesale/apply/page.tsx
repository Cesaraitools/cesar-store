"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, FileUp, Loader2 } from "lucide-react";

const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
const IMAGE_COMPRESSION_DIMENSIONS = [1800, 1600, 1400];
const IMAGE_COMPRESSION_QUALITIES = [0.82, 0.74, 0.66];
const ACCEPTED_DOCUMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const entityTypes = [
  { value: "shop", label: "محل" },
  { value: "distributor", label: "موزع" },
  { value: "company", label: "شركة" },
  { value: "other", label: "أخرى" },
];

const documentFields = [
  { key: "nationalIdFrontFile", label: "بطاقة الرقم القومي - الوجه الأمامي" },
  { key: "nationalIdBackFile", label: "بطاقة الرقم القومي - الوجه الخلفي" },
  { key: "taxCardFrontFile", label: "البطاقة الضريبية - الوجه الأمامي" },
  { key: "taxCardBackFile", label: "البطاقة الضريبية - الوجه الخلفي" },
  { key: "commercialRegisterFile", label: "السجل التجاري" },
] as const;

type DocumentFieldKey = (typeof documentFields)[number]["key"];

type DocumentState = {
  file: File | null;
  originalSize: number | null;
  compressed: boolean;
};

const emptyDocumentState: DocumentState = {
  file: null,
  originalSize: null,
  compressed: false,
};

function createEmptyDocuments() {
  return Object.fromEntries(
    documentFields.map((field) => [field.key, { ...emptyDocumentState }])
  ) as Record<DocumentFieldKey, DocumentState>;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} كيلوبايت`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} ميجابايت`;
}

function fileLabel(document?: DocumentState | null) {
  if (!document?.file) return "لم يتم اختيار ملف";

  const currentSize = formatBytes(document.file.size);

  if (document.compressed && document.originalSize) {
    return `${document.file.name} - تم الضغط من ${formatBytes(
      document.originalSize
    )} إلى ${currentSize}`;
  }

  return `${document.file.name} - ${currentSize}`;
}

function getCompressedImageName(fileName: string) {
  return `${fileName.replace(/\.[^.]+$/, "") || "document"}.jpg`;
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("تعذر قراءة الصورة. يرجى اختيار صورة واضحة بصيغة JPG أو PNG أو WEBP."));
    };
    image.src = url;
  });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("تعذر ضغط الصورة. يرجى اختيار ملف آخر."));
      },
      "image/jpeg",
      quality
    );
  });
}

async function compressImageFile(file: File) {
  const image = await loadImage(file);
  let bestBlob: Blob | null = null;

  for (const maxDimension of IMAGE_COMPRESSION_DIMENSIONS) {
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("تعذر تجهيز الصورة للرفع. يرجى اختيار ملف آخر.");
    }

    canvas.width = width;
    canvas.height = height;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    for (const quality of IMAGE_COMPRESSION_QUALITIES) {
      const blob = await canvasToJpegBlob(canvas, quality);

      if (!bestBlob || blob.size < bestBlob.size) {
        bestBlob = blob;
      }

      if (blob.size <= MAX_DOCUMENT_BYTES) {
        return new File([blob], getCompressedImageName(file.name), {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
      }
    }
  }

  if (!bestBlob || bestBlob.size >= file.size) {
    return file;
  }

  return new File([bestBlob], getCompressedImageName(file.name), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

async function prepareDocumentFile(file: File) {
  if (!ACCEPTED_DOCUMENT_TYPES.has(file.type)) {
    throw new Error("الملفات المسموحة: PDF أو صور JPG / JPEG / PNG / WEBP فقط.");
  }

  const originalSize = file.size;
  const preparedFile = file.type.startsWith("image/")
    ? await compressImageFile(file)
    : file;

  if (preparedFile.size > MAX_DOCUMENT_BYTES) {
    throw new Error(
      `حجم الملف بعد المعالجة ${formatBytes(
        preparedFile.size
      )}. الحد الأقصى لكل ملف 5 ميجابايت.`
    );
  }

  return {
    file: preparedFile,
    originalSize,
    compressed: preparedFile.size < originalSize,
  };
}

export default function WholesaleApplyPage() {
  const [loading, setLoading] = useState(false);
  const [processingFile, setProcessingFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submittedApplicationId, setSubmittedApplicationId] = useState("");
  const [documents, setDocuments] =
    useState<Record<DocumentFieldKey, DocumentState>>(createEmptyDocuments);

  async function handleDocumentChange(
    key: DocumentFieldKey,
    label: string,
    file: File | null,
    input: HTMLInputElement
  ) {
    setError(null);

    if (!file) {
      setDocuments((current) => ({
        ...current,
        [key]: { ...emptyDocumentState },
      }));
      return;
    }

    try {
      setProcessingFile(label);
      const prepared = await prepareDocumentFile(file);
      setDocuments((current) => ({
        ...current,
        [key]: prepared,
      }));
    } catch (fileError) {
      input.value = "";
      setDocuments((current) => ({
        ...current,
        [key]: { ...emptyDocumentState },
      }));
      setError(
        fileError instanceof Error ? fileError.message : "تعذر تجهيز الملف للرفع"
      );
    } finally {
      setProcessingFile(null);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (processingFile) {
      setError("يرجى الانتظار حتى ينتهي ضغط وتجهيز الملفات.");
      return;
    }

    const missingDocument = documentFields.find(
      (field) => !documents[field.key].file
    );

    if (missingDocument) {
      setError(`يرجى رفع ${missingDocument.label}`);
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const submittedPhone = String(formData.get("phone") || "").trim();

    for (const field of documentFields) {
      const file = documents[field.key].file;
      if (file) formData.set(field.key, file);
    }

    try {
      setLoading(true);
      const response = await fetch("/api/wholesale/applications", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || "تعذر إرسال طلب الانضمام");
      }

      setSubmittedApplicationId(payload?.application?.id || "");
      if (payload?.application?.id && submittedPhone) {
        window.localStorage.setItem(
          `wholesale-status-phone:${payload.application.id}`,
          submittedPhone
        );
      }
      setSuccess(true);
      form.reset();
      setDocuments(createEmptyDocuments());
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "تعذر إرسال طلب الانضمام"
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div dir="rtl" className="min-h-[70vh] bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-2xl rounded-2xl border border-emerald-100 bg-white p-8 text-center shadow-xl shadow-slate-200/70">
          <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
          <h1 className="mt-5 text-3xl font-black text-slate-950">
            تم استلام طلب الجملة
          </h1>
          <p className="mt-4 leading-8 text-slate-600">
            فريق سيزر سيراجع بيانات الكيان والمستندات الرسمية، وبعد الموافقة
            سيتم التواصل معك لتفعيل الوصول لقسم الجملة.
          </p>
          {submittedApplicationId && (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-black text-slate-400">رقم الطلب</div>
              <div className="mt-2 break-all text-lg font-black text-slate-950" dir="ltr">
                {submittedApplicationId}
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                احتفظ بهذا الرقم لمتابعة حالة مراجعة طلب الجملة.
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                سيستخدم فريق سيزر رقم واتساب المسجل للتواصل معك بخصوص الطلب
                ومساعدتك في متابعة حالة المراجعة.
              </p>
            </div>
          )}
          {submittedApplicationId && (
            <Link
              href={`/wholesale/status?id=${encodeURIComponent(
                submittedApplicationId
              )}`}
              className="mt-4 inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-4 text-sm font-black text-slate-700 transition hover:border-orange-300 hover:text-orange-700"
            >
              متابعة حالة الطلب
            </Link>
          )}
          <Link
            href="/wholesale"
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-4 text-sm font-black text-white transition hover:bg-orange-600"
          >
            <ArrowRight className="h-4 w-4" />
            العودة لقسم الجملة
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="bg-slate-50 px-4 py-10 text-slate-950 md:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/wholesale"
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-orange-700"
        >
          <ArrowRight className="h-4 w-4" />
          العودة لقسم الجملة
        </Link>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/60 md:p-8">
          <div className="mb-8 max-w-3xl">
            <h1 className="text-3xl font-black text-slate-950 md:text-4xl">
              طلب اعتماد تاجر جملة
            </h1>
            <p className="mt-3 leading-8 text-slate-600">
              البيانات والمستندات تستخدم للمراجعة الداخلية فقط. أسعار الجملة لا
              تظهر إلا بعد الموافقة. صور المستندات يتم ضغطها تلقائيًا قبل
              الإرسال للحفاظ على وضوحها وتقليل حجمها.
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
              {error}
            </div>
          )}

          {processingFile && (
            <div className="mb-6 flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700">
              <Loader2 className="h-4 w-4 animate-spin" />
              جار تجهيز {processingFile}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            <section className="grid gap-4 md:grid-cols-2">
              <Field label="اسم الكيان التجاري">
                <input name="businessName" required className="field-input" />
              </Field>
              <Field label="نوع الكيان">
                <select name="entityType" required className="field-input">
                  {entityTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="اسم المسؤول">
                <input name="contactName" required className="field-input" />
              </Field>
              <Field label="رقم الهاتف">
                <input
                  name="phone"
                  required
                  inputMode="numeric"
                  className="field-input"
                />
              </Field>
              <Field label="رقم واتساب الطلبات">
                <input
                  name="whatsapp"
                  required
                  inputMode="numeric"
                  className="field-input"
                />
              </Field>
              <div className="rounded-2xl border border-orange-100 bg-orange-50 p-4 text-sm leading-7 text-orange-900 md:col-span-2">
                <strong className="font-black">تنويه مهم:</strong> يجب أن يكون رقم
                الهاتف وواتساب تابعًا فعليًا للكيان التجاري أو المسؤول عن الطلب،
                لأنه سيكون وسيلة التواصل الأساسية مع متجر سيزر، وسيُستخدم لإرسال
                رقم طلب الجملة ومتابعة حالة المراجعة.
              </div>
              <Field label="بريد حساب الدخول لقسم الجملة">
                <input
                  name="email"
                  type="email"
                  required
                  className="field-input"
                  autoComplete="email"
                  inputMode="email"
                />
              </Field>
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-7 text-blue-900 md:col-span-2">
                <strong className="font-black">مهم لتفعيل حساب الجملة:</strong>{" "}
                استخدم البريد الإلكتروني الذي ستسجل به الدخول إلى متجر سيزر. بعد الموافقة،
                سيستخدم الأدمن هذا البريد لربط حسابك بأسعار وكتالوج الجملة.
              </div>
              <Field label="المحافظة">
                <input name="governorate" required className="field-input" />
              </Field>
              <Field label="المدينة">
                <input name="city" required className="field-input" />
              </Field>
              <Field label="العنوان التفصيلي">
                <input name="address" className="field-input" />
              </Field>
              <Field label="الرقم الضريبي">
                <input name="taxNumber" required className="field-input" />
              </Field>
              <Field label="رقم السجل التجاري">
                <input name="commercialRegisterNumber" required className="field-input" />
              </Field>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {documentFields.map((field) => (
                <FileField
                  key={field.key}
                  label={field.label}
                  document={documents[field.key]}
                  onChange={(file, input) =>
                    handleDocumentChange(field.key, field.label, file, input)
                  }
                />
              ))}
            </section>

            <Field label="ملاحظات إضافية">
              <textarea name="notes" rows={4} className="field-input resize-none" />
            </Field>

            <div className="flex flex-col gap-4 border-t border-slate-100 pt-6 md:flex-row md:items-center md:justify-between">
              <p className="text-sm leading-7 text-slate-500">
                بالضغط على إرسال، أنت تقر أن البيانات والمستندات المرفوعة صحيحة
                وتخضع لمراجعة سيزر.
              </p>
              <button
                type="submit"
                disabled={loading || Boolean(processingFile)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-7 py-4 text-sm font-black text-white shadow-lg shadow-slate-200 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileUp className="h-4 w-4" />
                )}
                {loading ? "جار إرسال الطلب..." : "إرسال طلب الاعتماد"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-slate-700">{label}</span>
      {children}
    </label>
  );
}

function FileField({
  label,
  document,
  onChange,
}: {
  label: string;
  document: DocumentState;
  onChange: (file: File | null, input: HTMLInputElement) => void;
}) {
  return (
    <label className="block rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-orange-300 hover:bg-orange-50/40">
      <span className="block text-sm font-black text-slate-800">{label}</span>
      <span className="mt-2 block min-h-14 rounded-xl bg-white px-3 py-3 text-xs font-bold leading-6 text-slate-500">
        {fileLabel(document)}
      </span>
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
        required
        className="mt-3 block w-full text-xs text-slate-500 file:ml-3 file:rounded-lg file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-xs file:font-black file:text-white"
        onChange={(event) =>
          onChange(event.target.files?.[0] || null, event.currentTarget)
        }
      />
    </label>
  );
}
