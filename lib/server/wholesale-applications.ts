import crypto from "crypto";
import path from "path";
import { createServiceRoleClient } from "@/lib/supabase/runtime";
import type {
  WholesaleApplication,
  WholesaleAdminCustomer,
  WholesaleApplicationDocument,
  WholesaleDocumentType,
  WholesaleEntityType,
  WholesaleApplicationStatus,
  WholesaleCustomerStatus,
} from "@/types/wholesale";

const WHOLESALE_DOCUMENT_BUCKET = "wholesale-documents";
const MAX_DOCUMENT_SIZE = 5 * 1024 * 1024;

const DOCUMENT_LABELS: Record<WholesaleDocumentType, string> = {
  national_id_front: "بطاقة الرقم القومي - الوجه الأمامي",
  national_id_back: "بطاقة الرقم القومي - الوجه الخلفي",
  tax_card_front: "البطاقة الضريبية - الوجه الأمامي",
  tax_card_back: "البطاقة الضريبية - الوجه الخلفي",
  commercial_register: "السجل التجاري",
};

const ALLOWED_DOCUMENT_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const ENTITY_TYPES = new Set<WholesaleEntityType>([
  "shop",
  "distributor",
  "company",
  "other",
]);

const APPLICATION_STATUSES = new Set<WholesaleApplicationStatus>([
  "pending",
  "under_review",
  "approved",
  "rejected",
]);

const WHOLESALE_CUSTOMER_STATUSES = new Set<WholesaleCustomerStatus>([
  "pending_account",
  "active",
  "suspended",
]);

function cleanText(value: FormDataEntryValue | null, maxLength = 500) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function normalizeOptional(value: string) {
  return value.trim() ? value.trim() : null;
}

function normalizePhone(value: string) {
  return value
    .replace(/[\u0660-\u0669]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x0660)
    )
    .replace(/[\u06f0-\u06f9]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x06f0)
    )
    .replace(/\D/g, "")
    .slice(0, 20);
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isValidEmail(value: string) {
  if (!value) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function toApplication(row: any): WholesaleApplication {
  return {
    id: String(row.id),
    businessName: row.business_name || "",
    entityType: row.entity_type || "other",
    contactName: row.contact_name || "",
    phone: row.phone || "",
    whatsapp: row.whatsapp || "",
    email: row.email || null,
    governorate: row.governorate || "",
    city: row.city || "",
    address: row.address || null,
    taxNumber: row.tax_number || null,
    commercialRegisterNumber: row.commercial_register_number || null,
    notes: row.notes || null,
    documents: Array.isArray(row.documents) ? row.documents : [],
    status: row.status || "pending",
    reviewNotes: row.review_notes || null,
    reviewedAt: row.reviewed_at || null,
    reviewedBy: row.reviewed_by || null,
    wholesaleCustomer: row.wholesaleCustomer || null,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

function toWholesaleCustomerSummary(row: any) {
  if (!row?.id) return null;

  return {
    id: String(row.id),
    status: row.status || "pending_account",
    authUserId: row.auth_user_id ? String(row.auth_user_id) : null,
    approvedAt: row.approved_at || new Date().toISOString(),
  };
}

function toWholesaleAdminCustomer(row: any): WholesaleAdminCustomer {
  return {
    id: String(row.id),
    applicationId: row.application_id ? String(row.application_id) : null,
    businessName: row.business_name || "",
    entityType: row.entity_type || "other",
    contactName: row.contact_name || "",
    phone: row.phone || "",
    whatsapp: row.whatsapp || "",
    email: row.email || null,
    governorate: row.governorate || "",
    city: row.city || "",
    address: row.address || null,
    taxNumber: row.tax_number || null,
    commercialRegisterNumber: row.commercial_register_number || null,
    status: row.status || "pending_account",
    authUserId: row.auth_user_id ? String(row.auth_user_id) : null,
    approvedAt: row.approved_at || null,
    createdAt: row.created_at || row.approved_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

async function findAuthUserByEmail(email: string) {
  const supabase = createServiceRoleClient();
  const targetEmail = normalizeEmail(email);

  if (!targetEmail || !isValidEmail(targetEmail)) {
    throw new Error("يرجى إدخال بريد إلكتروني صحيح لحساب العميل");
  }

  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (error) {
      throw error;
    }

    const users =
      (data as { users?: Array<{ id: string; email?: string | null }> }).users || [];
    const match = users.find(
      (user) => normalizeEmail(user.email || "") === targetEmail
    );

    if (match) {
      return match;
    }

    if (!(data as { nextPage?: number | null }).nextPage) {
      break;
    }
  }

  return null;
}

async function uploadDocument(input: {
  applicationId: string;
  file: File;
  type: WholesaleDocumentType;
}) {
  const extension = ALLOWED_DOCUMENT_TYPES[input.file.type];

  if (!extension) {
    throw new Error(`${DOCUMENT_LABELS[input.type]} يجب أن يكون PDF أو صورة واضحة`);
  }

  if (input.file.size <= 0 || input.file.size > MAX_DOCUMENT_SIZE) {
    throw new Error(`${DOCUMENT_LABELS[input.type]} أكبر من 5 ميجابايت`);
  }

  const buffer = Buffer.from(await input.file.arrayBuffer());
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  const safeName = path
    .parse(input.file.name || input.type)
    .name.replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const storagePath = `${input.applicationId}/${input.type}/${hash}-${safeName || input.type}.${extension}`;
  const supabase = createServiceRoleClient();

  const { error } = await supabase.storage
    .from(WHOLESALE_DOCUMENT_BUCKET)
    .upload(storagePath, buffer, {
      contentType: input.file.type,
      upsert: false,
    });

  if (error && !/already exists/i.test(error.message)) {
    throw error;
  }

  return {
    type: input.type,
    label: DOCUMENT_LABELS[input.type],
    fileName: input.file.name || `${input.type}.${extension}`,
    mimeType: input.file.type,
    size: input.file.size,
    storagePath,
  } satisfies WholesaleApplicationDocument;
}

export async function createWholesaleApplication(formData: FormData) {
  const entityType = cleanText(formData.get("entityType"), 40) as WholesaleEntityType;
  const businessName = cleanText(formData.get("businessName"), 160);
  const contactName = cleanText(formData.get("contactName"), 140);
  const phone = normalizePhone(cleanText(formData.get("phone"), 40));
  const whatsapp = normalizePhone(cleanText(formData.get("whatsapp"), 40));
  const email = normalizeEmail(cleanText(formData.get("email"), 160));
  const governorate = cleanText(formData.get("governorate"), 100);
  const city = cleanText(formData.get("city"), 100);
  const address = cleanText(formData.get("address"), 300);
  const taxNumber = cleanText(formData.get("taxNumber"), 80);
  const commercialRegisterNumber = cleanText(
    formData.get("commercialRegisterNumber"),
    80
  );
  const notes = cleanText(formData.get("notes"), 1000);

  if (!businessName || !ENTITY_TYPES.has(entityType)) {
    throw new Error("بيانات الكيان التجاري غير مكتملة");
  }

  if (!contactName || !phone || !whatsapp || !governorate || !city) {
    throw new Error("يرجى إكمال بيانات التواصل والموقع");
  }

  if (!taxNumber || !commercialRegisterNumber) {
    throw new Error("يرجى إدخال الرقم الضريبي ورقم السجل التجاري");
  }

  if (phone.length < 10 || whatsapp.length < 10) {
    throw new Error("رقم الهاتف أو واتساب غير صحيح");
  }

  if (!email || !isValidEmail(email)) {
    throw new Error("يرجى إدخال بريد إلكتروني صحيح لتفعيل حساب الجملة");
  }

  const requiredDocuments: Array<{
    field: string;
    type: WholesaleDocumentType;
  }> = [
    { field: "nationalIdFrontFile", type: "national_id_front" },
    { field: "nationalIdBackFile", type: "national_id_back" },
    { field: "taxCardFrontFile", type: "tax_card_front" },
    { field: "taxCardBackFile", type: "tax_card_back" },
    { field: "commercialRegisterFile", type: "commercial_register" },
  ];

  const files = requiredDocuments.map((document) => ({
    ...document,
    file: formData.get(document.field),
  }));

  if (files.some((item) => !(item.file instanceof File) || item.file.size <= 0)) {
    throw new Error("يرجى رفع وجهي البطاقة الشخصية ووجهي البطاقة الضريبية والسجل التجاري");
  }

  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  const { data: inserted, error: insertError } = await supabase
    .from("wholesale_applications")
    .insert({
      business_name: businessName,
      entity_type: entityType,
      contact_name: contactName,
      phone,
      whatsapp,
      email,
      governorate,
      city,
      address: normalizeOptional(address),
      tax_number: normalizeOptional(taxNumber),
      commercial_register_number: normalizeOptional(commercialRegisterNumber),
      notes: normalizeOptional(notes),
      status: "pending",
      created_at: now,
      updated_at: now,
    })
    .select("*")
    .single();

  if (insertError) {
    throw insertError;
  }

  const applicationId = String(inserted.id);
  const documents = await Promise.all(
    files.map((item) =>
      uploadDocument({
        applicationId,
        type: item.type,
        file: item.file as File,
      })
    )
  );

  const { data: updated, error: updateError } = await supabase
    .from("wholesale_applications")
    .update({
      documents,
      updated_at: new Date().toISOString(),
    })
    .eq("id", applicationId)
    .select("*")
    .single();

  if (updateError) {
    throw updateError;
  }

  return toApplication(updated);
}

export async function listWholesaleApplications() {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("wholesale_applications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    throw error;
  }

  const applications = data || [];
  const applicationIds = applications.map((item) => item.id).filter(Boolean);
  const customerByApplicationId = new Map<string, ReturnType<typeof toWholesaleCustomerSummary>>();

  if (applicationIds.length > 0) {
    const { data: customers, error: customersError } = await supabase
      .from("wholesale_customers")
      .select("id, application_id, status, auth_user_id, approved_at")
      .in("application_id", applicationIds);

    if (customersError) {
      throw customersError;
    }

    for (const customer of customers || []) {
      customerByApplicationId.set(
        String(customer.application_id),
        toWholesaleCustomerSummary(customer)
      );
    }
  }

  return applications.map((application) =>
    toApplication({
      ...application,
      wholesaleCustomer:
        customerByApplicationId.get(String(application.id)) || null,
    })
  );
}

export async function listWholesaleCustomersForAdmin(options?: {
  status?: WholesaleCustomerStatus | "all";
  query?: string;
}) {
  const supabase = createServiceRoleClient();
  let customersQuery = supabase
    .from("wholesale_customers")
    .select("*")
    .order("approved_at", { ascending: false })
    .limit(300);

  if (
    options?.status &&
    options.status !== "all" &&
    WHOLESALE_CUSTOMER_STATUSES.has(options.status)
  ) {
    customersQuery = customersQuery.eq("status", options.status);
  }

  const { data, error } = await customersQuery;

  if (error) {
    throw error;
  }

  const normalizedQuery = String(options?.query || "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 120)
    .toLowerCase();

  const customers = (data || []).map(toWholesaleAdminCustomer);

  if (!normalizedQuery) {
    return customers;
  }

  return customers.filter((customer) =>
    [
      customer.businessName,
      customer.contactName,
      customer.phone,
      customer.whatsapp,
      customer.email,
      customer.governorate,
      customer.city,
      customer.taxNumber,
      customer.commercialRegisterNumber,
      customer.authUserId,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery)
  );
}

async function ensureWholesaleCustomerForApplication(application: WholesaleApplication) {
  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  async function findExistingCustomer() {
    const { data, error } = await supabase
      .from("wholesale_customers")
      .select("id, status, auth_user_id, approved_at")
      .eq("application_id", application.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  const existingCustomer = await findExistingCustomer();

  if (existingCustomer) {
    return toWholesaleCustomerSummary(existingCustomer);
  }

  const { data, error } = await supabase
    .from("wholesale_customers")
    .insert({
      application_id: application.id,
      business_name: application.businessName,
      entity_type: application.entityType,
      contact_name: application.contactName,
      phone: application.phone,
      whatsapp: application.whatsapp,
      email: application.email,
      governorate: application.governorate,
      city: application.city,
      address: application.address,
      tax_number: application.taxNumber,
      commercial_register_number: application.commercialRegisterNumber,
      status: "pending_account",
      approved_at: application.reviewedAt || now,
      updated_at: now,
    })
    .select("id, status, approved_at")
    .single();

  if (error) {
    if (error.code === "23505" || /duplicate key/i.test(error.message || "")) {
      const duplicateCustomer = await findExistingCustomer();
      if (duplicateCustomer) {
        return toWholesaleCustomerSummary(duplicateCustomer);
      }
    }

    throw error;
  }

  return toWholesaleCustomerSummary(data);
}

export async function getWholesaleApplicationStatus(input: {
  id: string;
  phone: string;
}) {
  const id = input.id.trim();
  const phone = normalizePhone(input.phone);

  if (!id || !phone || phone.length < 10) {
    throw new Error("بيانات المتابعة غير صحيحة");
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("wholesale_applications")
    .select(
      [
        "id",
        "business_name",
        "entity_type",
        "contact_name",
        "phone",
        "whatsapp",
        "status",
        "review_notes",
        "reviewed_at",
        "created_at",
        "updated_at",
      ].join(",")
    )
    .eq("id", id)
    .or(`phone.eq.${phone},whatsapp.eq.${phone}`)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const statusRow = data as unknown as Record<string, unknown>;
  const application = toApplication({
    ...statusRow,
    documents: [],
    email: null,
    governorate: "",
    city: "",
    address: null,
    tax_number: null,
    commercial_register_number: null,
    notes: null,
    reviewed_by: null,
  });

  return {
    id: application.id,
    businessName: application.businessName,
    entityType: application.entityType,
    contactName: application.contactName,
    status: application.status,
    reviewNotes: application.reviewNotes,
    reviewedAt: application.reviewedAt,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
  };
}

export async function updateWholesaleApplicationStatus(input: {
  id: string;
  status: WholesaleApplicationStatus;
  reviewNotes?: string | null;
  reviewedBy: string;
}) {
  if (!APPLICATION_STATUSES.has(input.status)) {
    throw new Error("Invalid wholesale application status");
  }

  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("wholesale_applications")
    .update({
      status: input.status,
      review_notes: normalizeOptional(input.reviewNotes || ""),
      reviewed_at: now,
      reviewed_by: input.reviewedBy,
      updated_at: now,
    })
    .eq("id", input.id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const application = toApplication(data);

  if (application.status === "approved") {
    application.wholesaleCustomer =
      await ensureWholesaleCustomerForApplication(application);
  }

  return application;
}

export async function linkWholesaleCustomerAccount(input: {
  applicationId: string;
  accountEmail: string;
}) {
  const supabase = createServiceRoleClient();
  const accountEmail = normalizeEmail(input.accountEmail);
  const authUser = await findAuthUserByEmail(accountEmail);

  if (!authUser) {
    throw new Error("لم يتم العثور على حساب مستخدم بهذا البريد");
  }

  const { data: application, error: applicationError } = await supabase
    .from("wholesale_applications")
    .select("id, status")
    .eq("id", input.applicationId)
    .maybeSingle();

  if (applicationError) {
    throw applicationError;
  }

  if (!application || application.status !== "approved") {
    throw new Error("لا يمكن تفعيل حساب الجملة قبل الموافقة على الطلب");
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("wholesale_customers")
    .update({
      auth_user_id: authUser.id,
      email: accountEmail,
      status: "active",
      updated_at: now,
    })
    .eq("application_id", input.applicationId)
    .select("id, status, auth_user_id, approved_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("هذا الحساب مربوط بالفعل بعميل جملة آخر");
    }

    throw error;
  }

  return toWholesaleCustomerSummary(data);
}

export async function updateWholesaleCustomerStatus(input: {
  applicationId: string;
  status: WholesaleCustomerStatus;
}) {
  if (!WHOLESALE_CUSTOMER_STATUSES.has(input.status)) {
    throw new Error("Invalid wholesale customer status");
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("wholesale_customers")
    .update({
      status: input.status,
      updated_at: new Date().toISOString(),
    })
    .eq("application_id", input.applicationId)
    .select("id, status, auth_user_id, approved_at")
    .single();

  if (error) {
    throw error;
  }

  return toWholesaleCustomerSummary(data);
}

export async function getWholesaleCustomerForAuthUser(authUserId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("wholesale_customers")
    .select(
      [
        "id",
        "application_id",
        "business_name",
        "contact_name",
        "phone",
        "whatsapp",
        "email",
        "status",
        "auth_user_id",
        "approved_at",
        "updated_at",
      ].join(",")
    )
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const customer = data as unknown as Record<string, any>;

  return {
    id: String(customer.id),
    applicationId: String(customer.application_id),
    businessName: customer.business_name || "",
    contactName: customer.contact_name || "",
    phone: customer.phone || "",
    whatsapp: customer.whatsapp || "",
    email: customer.email || null,
    status: customer.status || "pending_account",
    approvedAt: customer.approved_at || null,
    updatedAt: customer.updated_at || null,
  };
}

export async function createWholesaleDocumentSignedUrl(storagePath: string) {
  const normalizedPath = storagePath.trim();

  if (!normalizedPath || normalizedPath.includes("..")) {
    throw new Error("Invalid document path");
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.storage
    .from(WHOLESALE_DOCUMENT_BUCKET)
    .createSignedUrl(normalizedPath, 60 * 5);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}
