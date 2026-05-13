import crypto from "crypto";
import { normalizeCategory } from "@/lib/category-normalizer";
import { normalizeImagesArray } from "@/lib/image-normalizer";
import { createServiceRoleClient } from "@/lib/supabase/runtime";
import type {
  ProductImportFailure,
  ProductImportJobSnapshot,
  ProductImportStatus,
} from "@/types/product-import";
import { ensureMediaAssetForSource } from "@/lib/server/media-assets";

const IMPORT_CHUNK_SIZE = 12;
const IMAGE_UPLOAD_CONCURRENCY = 3;

type RawImportRow = Record<string, any>;

type PreparedImportRow = {
  active: boolean;
  category: string;
  description_ar: string;
  description_en: string;
  images: string[];
  name_ar: string;
  name_en: string;
  price: number;
  source_index: number;
  stock: number;
};

type ImportJobRow = {
  created_at: string;
  failures_json: ProductImportFailure[] | null;
  file_name: string;
  finished_at: string | null;
  id: string;
  image_cache_json: Record<string, string> | null;
  known_product_keys_json: string[] | null;
  last_error: string | null;
  next_index: number;
  rows_failed: number;
  rows_json: PreparedImportRow[] | null;
  rows_processed: number;
  rows_skipped: number;
  rows_success: number;
  rows_total: number;
  started_at: string | null;
  status: ProductImportStatus;
  updated_at: string;
};

function normalizeBoolean(input: any) {
  return (
    input === true ||
    input === "TRUE" ||
    input === "true" ||
    input === "1" ||
    input === 1
  );
}

function buildProductKey(nameAr: string, category: string) {
  return `${nameAr.trim().toLowerCase()}::${normalizeCategory(category)}`;
}

function toFailure(index: number, name: string, reason: string): ProductImportFailure {
  return {
    index,
    name: name || `Row ${index}`,
    reason,
  };
}

function toJobSnapshot(job: ImportJobRow): ProductImportJobSnapshot {
  return {
    id: job.id,
    fileName: job.file_name,
    status: job.status,
    rowsTotal: job.rows_total,
    rowsProcessed: job.rows_processed,
    rowsSuccess: job.rows_success,
    rowsFailed: job.rows_failed,
    rowsSkipped: job.rows_skipped,
    nextIndex: job.next_index,
    startedAt: job.started_at,
    finishedAt: job.finished_at,
    lastError: job.last_error,
    failures: Array.isArray(job.failures_json) ? job.failures_json : [],
  };
}

function prepareImportRow(rawRow: RawImportRow, sourceIndex: number) {
  const nameAr = String(rawRow.name_ar ?? "").trim();
  const nameEn = String(rawRow.name_en ?? "").trim();
  const descriptionAr = String(rawRow.description_ar ?? "").trim();
  const descriptionEn = String(rawRow.description_en ?? "").trim();
  const category = normalizeCategory(String(rawRow.category ?? "").trim());
  const price = Number(rawRow.price);
  const stock = Number(rawRow.stock);
  const images = normalizeImagesArray(rawRow.images);

  if (!nameAr) {
    return { failure: toFailure(sourceIndex, nameAr, "Missing name_ar") };
  }

  if (!nameEn) {
    return { failure: toFailure(sourceIndex, nameAr, "Missing name_en") };
  }

  if (!descriptionAr) {
    return { failure: toFailure(sourceIndex, nameAr, "Missing description_ar") };
  }

  if (!descriptionEn) {
    return { failure: toFailure(sourceIndex, nameAr, "Missing description_en") };
  }

  if (!category) {
    return { failure: toFailure(sourceIndex, nameAr, "Missing category") };
  }

  if (!Number.isFinite(price) || price <= 0) {
    return { failure: toFailure(sourceIndex, nameAr, "Invalid price") };
  }

  if (!Number.isFinite(stock) || stock < 0) {
    return { failure: toFailure(sourceIndex, nameAr, "Invalid stock") };
  }

  if (!images.length) {
    return { failure: toFailure(sourceIndex, nameAr, "Missing valid images") };
  }

  return {
    row: {
      active: normalizeBoolean(rawRow.active),
      category,
      description_ar: descriptionAr,
      description_en: descriptionEn,
      images,
      name_ar: nameAr,
      name_en: nameEn,
      price,
      source_index: sourceIndex,
      stock: Math.floor(stock),
    } satisfies PreparedImportRow,
  };
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T, index: number) => Promise<R>
) {
  const results = new Array<R>(values.length);
  let cursor = 0;

  async function worker() {
    while (cursor < values.length) {
      const currentIndex = cursor++;
      results[currentIndex] = await mapper(values[currentIndex], currentIndex);
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, values.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return results;
}

async function resolveRowImages(
  imageSources: string[],
  imageCache: Map<string, string>,
  appOrigin: string
) {
  const urls = await mapWithConcurrency(
    imageSources,
    IMAGE_UPLOAD_CONCURRENCY,
    async (source) => {
      const cached = imageCache.get(source);
      if (cached) {
        return cached;
      }

      const asset = await ensureMediaAssetForSource({
        appOrigin,
        imageUrl: source,
        uploadType: "product",
      });

      imageCache.set(source, asset.url);
      return asset.url;
    }
  );

  return Array.from(new Set(urls.filter(Boolean)));
}

export async function createProductImportJob(input: {
  fileName: string;
  rows: RawImportRow[];
}) {
  const supabase = createServiceRoleClient();
  const failures: ProductImportFailure[] = [];
  const preparedRows: PreparedImportRow[] = [];

  input.rows.forEach((row, index) => {
    const result = prepareImportRow(row, index + 1);
    if ("failure" in result && result.failure) {
      failures.push(result.failure);
      return;
    }

    preparedRows.push(result.row);
  });

  const { data: existingProducts, error: existingProductsError } = await supabase
    .from("products")
    .select("name_ar, category");

  if (existingProductsError) {
    throw existingProductsError;
  }

  const knownProductKeys = Array.from(
    new Set(
      (existingProducts || []).map((product) =>
        buildProductKey(String(product.name_ar || ""), String(product.category || ""))
      )
    )
  );

  const now = new Date().toISOString();
  const { data: createdJob, error: createJobError } = await supabase
    .from("import_jobs")
    .insert([
      {
        file_name: input.fileName,
        status: preparedRows.length ? "pending" : "completed",
        rows_total: input.rows.length,
        rows_processed: failures.length,
        rows_success: 0,
        rows_failed: failures.length,
        rows_skipped: 0,
        next_index: 0,
        rows_json: preparedRows,
        known_product_keys_json: knownProductKeys,
        image_cache_json: {},
        failures_json: failures,
        started_at: preparedRows.length ? null : now,
        finished_at: preparedRows.length ? null : now,
        updated_at: now,
      },
    ])
    .select("*")
    .single();

  if (createJobError) {
    throw createJobError;
  }

  return toJobSnapshot(createdJob as ImportJobRow);
}

export async function getProductImportJob(jobId: string) {
  const supabase = createServiceRoleClient();
  const { data: job, error } = await supabase
    .from("import_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (error) {
    throw error;
  }

  return toJobSnapshot(job as ImportJobRow);
}

export async function processProductImportJob(jobId: string, appOrigin: string) {
  const supabase = createServiceRoleClient();
  const { data: jobData, error: jobError } = await supabase
    .from("import_jobs")
    .select("*")
    .eq("id", jobId)
    .single();

  if (jobError) {
    throw jobError;
  }

  const job = jobData as ImportJobRow;

  if (job.status === "completed" || job.status === "failed") {
    return toJobSnapshot(job);
  }

  const rows = Array.isArray(job.rows_json) ? job.rows_json : [];
  const chunkRows = rows.slice(job.next_index, job.next_index + IMPORT_CHUNK_SIZE);

  if (!chunkRows.length) {
    const { data: completedJob, error: completeError } = await supabase
      .from("import_jobs")
      .update({
        status: "completed",
        finished_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .select("*")
      .single();

    if (completeError) {
      throw completeError;
    }

    return toJobSnapshot(completedJob as ImportJobRow);
  }

  const knownProductKeys = new Set(
    Array.isArray(job.known_product_keys_json) ? job.known_product_keys_json : []
  );
  const imageCache = new Map<string, string>(
    Object.entries(job.image_cache_json || {})
  );
  const failures = [...(Array.isArray(job.failures_json) ? job.failures_json : [])];

  let rowsProcessed = job.rows_processed;
  let rowsSuccess = job.rows_success;
  let rowsFailed = job.rows_failed;
  let rowsSkipped = job.rows_skipped;

  try {
    for (const row of chunkRows) {
      const productKey = buildProductKey(row.name_ar, row.category);

      if (knownProductKeys.has(productKey)) {
        rowsProcessed += 1;
        rowsSkipped += 1;
        continue;
      }

      try {
        const images = await resolveRowImages(row.images, imageCache, appOrigin);

        if (!images.length) {
          throw new Error("No valid images resolved for this product");
        }

        const now = new Date().toISOString();
        const { error: insertError } = await supabase.from("products").insert([
          {
            id: crypto.randomUUID(),
            name_ar: row.name_ar,
            name_en: row.name_en,
            description_ar: row.description_ar,
            description_en: row.description_en,
            price: row.price,
            image_url: images[0],
            images_json: images,
            stock: row.stock,
            category: row.category,
            is_active: row.active,
            created_at: now,
            updated_at: now,
          },
        ]);

        if (insertError) {
          throw insertError;
        }

        knownProductKeys.add(productKey);
        rowsProcessed += 1;
        rowsSuccess += 1;
      } catch (error) {
        rowsProcessed += 1;
        rowsFailed += 1;
        failures.push(
          toFailure(
            row.source_index,
            row.name_ar,
            error instanceof Error ? error.message : "Unknown import error"
          )
        );
      }
    }

    const nextIndex = job.next_index + chunkRows.length;
    const isCompleted = nextIndex >= rows.length;
    const now = new Date().toISOString();

    const { data: updatedJob, error: updateError } = await supabase
      .from("import_jobs")
      .update({
        status: isCompleted ? "completed" : "processing",
        rows_processed: rowsProcessed,
        rows_success: rowsSuccess,
        rows_failed: rowsFailed,
        rows_skipped: rowsSkipped,
        next_index: nextIndex,
        known_product_keys_json: Array.from(knownProductKeys),
        image_cache_json: Object.fromEntries(imageCache),
        failures_json: failures,
        started_at: job.started_at || now,
        finished_at: isCompleted ? now : null,
        updated_at: now,
        last_error: null,
      })
      .eq("id", jobId)
      .select("*")
      .single();

    if (updateError) {
      throw updateError;
    }

    return toJobSnapshot(updatedJob as ImportJobRow);
  } catch (error) {
    const { data: failedJob, error: failUpdateError } = await supabase
      .from("import_jobs")
      .update({
        status: "failed",
        last_error: error instanceof Error ? error.message : "Unknown import failure",
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .select("*")
      .single();

    if (failUpdateError) {
      throw failUpdateError;
    }

    return toJobSnapshot(failedJob as ImportJobRow);
  }
}
