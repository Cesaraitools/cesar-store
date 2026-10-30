import { randomUUID } from "crypto";
import { normalizeImagesArray } from "@/lib/image-normalizer";
import { createServiceRoleClient } from "@/lib/supabase/runtime";
import { getMetaPublisherReadiness, getSiteOrigin } from "./config";
import { publishToMeta } from "./meta";
import type {
  SocialPlatform,
  SocialPostQueueRow,
  SocialProductCandidate,
  SocialPublicationEvent,
  SocialPublisherSettings,
} from "./types";

const SETTINGS_ID = "default";
const ACTIVE_QUEUE_STATUSES = ["draft", "queued", "processing"];
const CAIRO_TIME_ZONE = "Africa/Cairo";
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

type ProductRow = {
  id: string;
  name_ar: string | null;
  name_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  price: number | string | null;
  stock: number | null;
  category: string | null;
  image_url: string | null;
  images_json: unknown;
  is_active: boolean | null;
  deleted_at: string | null;
  updated_at: string | null;
};

export type PublisherOverview = {
  settings: SocialPublisherSettings;
  readiness: ReturnType<typeof getMetaPublisherReadiness>;
  queue: SocialPostQueueRow[];
  events: SocialPublicationEvent[];
  products: SocialProductCandidate[];
};

function cleanText(value: unknown) {
  return String(value || "")
    .replace(/[#*_`>~\[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function absolutePublicUrl(value: string) {
  const source = String(value || "").trim();
  if (!source) return "";

  try {
    const url = new URL(source, getSiteOrigin());
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

function productImage(row: ProductRow) {
  const source =
    Array.isArray(row.images_json) && row.images_json.length
      ? row.images_json
      : row.image_url
      ? [row.image_url]
      : [];

  return absolutePublicUrl(normalizeImagesArray(source)[0] || "");
}

function productName(row: ProductRow) {
  return cleanText(row.name_ar || row.name_en || "منتج من سيزر ستور");
}

function productUrl(row: ProductRow) {
  return `${getSiteOrigin()}/product/${encodeURIComponent(row.id)}`;
}

function toCandidate(row: ProductRow): SocialProductCandidate {
  return {
    id: row.id,
    name: productName(row),
    price: Math.max(0, Number(row.price) || 0),
    stock: Math.max(0, Number(row.stock) || 0),
    imageUrl: productImage(row),
    productUrl: productUrl(row),
    category: cleanText(row.category),
  };
}

export function buildProductCaption(row: ProductRow) {
  const name = productName(row);
  const description = cleanText(row.description_ar || row.description_en).slice(
    0,
    260
  );
  const price = Math.max(0, Number(row.price) || 0).toLocaleString("ar-EG", {
    maximumFractionDigits: 2,
  });
  const lines = [name];

  if (description) lines.push("", description);

  lines.push(
    "",
    `السعر الحالي: ${price} ج.م`,
    "متوفر الآن لدى سيزر ستور.",
    `للطلب والتفاصيل: ${productUrl(row)}`,
    "",
    "#CesarStore #سيزر_ستور #اكسسوارات_سيارات"
  );

  return lines.join("\n");
}

function normalizeSettings(row: Record<string, unknown>) {
  const rawTimes = Array.isArray(row.posting_times) ? row.posting_times : ["12:00"];

  return {
    ...row,
    id: SETTINGS_ID,
    enabled: Boolean(row.enabled),
    mode: row.mode === "live" ? "live" : "draft",
    facebook_enabled: Boolean(row.facebook_enabled),
    instagram_enabled: Boolean(row.instagram_enabled),
    auto_queue_enabled: Boolean(row.auto_queue_enabled),
    min_stock: Number(row.min_stock) || 0,
    repeat_cooldown_days: Number(row.repeat_cooldown_days) || 45,
    daily_post_limit: Number(row.daily_post_limit) || 1,
    posting_times: rawTimes.map(String).filter((value) => TIME_PATTERN.test(value)),
    timezone: String(row.timezone || CAIRO_TIME_ZONE),
  } as SocialPublisherSettings;
}

export async function getPublisherSettings() {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("social_publisher_settings")
    .select("*")
    .eq("id", SETTINGS_ID)
    .single();

  if (error || !data) throw error || new Error("Publisher settings not found.");
  return normalizeSettings(data as Record<string, unknown>);
}

async function listProductRows(limit = 500) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id,name_ar,name_en,description_ar,description_en,price,stock,category,image_url,images_json,is_active,deleted_at,updated_at"
    )
    .is("deleted_at", null)
    .eq("is_active", true)
    .gt("stock", 0)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as ProductRow[];
}

export async function getPublisherOverview(): Promise<PublisherOverview> {
  const supabase = createServiceRoleClient();
  const [settings, productsResult, queueResult, eventsResult] = await Promise.all([
    getPublisherSettings(),
    listProductRows(500),
    supabase
      .from("social_post_queue")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("social_publication_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (queueResult.error) throw queueResult.error;
  if (eventsResult.error) throw eventsResult.error;

  const enabledPlatforms: SocialPlatform[] = [];
  if (settings.facebook_enabled) enabledPlatforms.push("facebook");
  if (settings.instagram_enabled) enabledPlatforms.push("instagram");

  return {
    settings,
    readiness: getMetaPublisherReadiness(enabledPlatforms),
    queue: (queueResult.data || []) as SocialPostQueueRow[],
    events: (eventsResult.data || []) as SocialPublicationEvent[],
    products: productsResult.map(toCandidate).filter((product) => product.imageUrl),
  };
}

export async function updatePublisherSettings(input: {
  enabled?: boolean;
  mode?: "draft" | "live";
  facebook_enabled?: boolean;
  instagram_enabled?: boolean;
  auto_queue_enabled?: boolean;
  min_stock?: number;
  repeat_cooldown_days?: number;
  daily_post_limit?: number;
  posting_times?: string[];
}) {
  const current = await getPublisherSettings();
  const postingTimes = Array.from(
    new Set((input.posting_times || current.posting_times).map(String))
  )
    .filter((value) => TIME_PATTERN.test(value))
    .sort();

  if (!postingTimes.length) {
    throw new Error("At least one valid Cairo posting time is required.");
  }

  const next = {
    enabled: input.enabled ?? current.enabled,
    mode: input.mode === "live" ? "live" : input.mode === "draft" ? "draft" : current.mode,
    facebook_enabled: input.facebook_enabled ?? current.facebook_enabled,
    instagram_enabled: input.instagram_enabled ?? current.instagram_enabled,
    auto_queue_enabled: input.auto_queue_enabled ?? current.auto_queue_enabled,
    min_stock: Math.max(0, Math.trunc(input.min_stock ?? current.min_stock)),
    repeat_cooldown_days: Math.min(
      365,
      Math.max(1, Math.trunc(input.repeat_cooldown_days ?? current.repeat_cooldown_days))
    ),
    daily_post_limit: Math.min(
      10,
      Math.max(1, Math.trunc(input.daily_post_limit ?? current.daily_post_limit))
    ),
    posting_times: postingTimes,
    timezone: CAIRO_TIME_ZONE,
    updated_at: new Date().toISOString(),
  };

  const enabledPlatforms: SocialPlatform[] = [];
  if (next.facebook_enabled) enabledPlatforms.push("facebook");
  if (next.instagram_enabled) enabledPlatforms.push("instagram");

  if (next.enabled && next.mode === "live") {
    const readiness = getMetaPublisherReadiness(enabledPlatforms);
    if (!readiness.configured) {
      throw new Error(`Missing Meta configuration: ${readiness.missing.join(", ")}`);
    }
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("social_publisher_settings")
    .update(next)
    .eq("id", SETTINGS_ID)
    .select("*")
    .single();

  if (error || !data) throw error || new Error("Failed to update publisher settings.");
  return normalizeSettings(data as Record<string, unknown>);
}

async function getProductById(productId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("products")
    .select(
      "id,name_ar,name_en,description_ar,description_en,price,stock,category,image_url,images_json,is_active,deleted_at,updated_at"
    )
    .eq("id", productId)
    .maybeSingle();

  if (error) throw error;
  return (data as ProductRow | null) || null;
}

async function recordEvent(input: {
  queueId?: string | null;
  eventType: string;
  platform?: SocialPlatform | null;
  details?: Record<string, unknown>;
}) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("social_publication_events").insert({
    queue_id: input.queueId || null,
    event_type: input.eventType,
    platform: input.platform || null,
    details: input.details || {},
  });

  if (error) console.error("SOCIAL PUBLISHER EVENT ERROR:", error);
}

export async function queueProductPosts(input: {
  productId: string;
  platforms: SocialPlatform[];
  scheduledFor: string;
  status?: "draft" | "queued";
  createdBy?: string | null;
  idempotencyPrefix?: string;
}) {
  const product = await getProductById(input.productId);
  const scheduledFor = new Date(input.scheduledFor);

  if (!product || product.deleted_at || !product.is_active) {
    throw new Error("The selected product is not active.");
  }

  if ((Number(product.stock) || 0) <= 0) {
    throw new Error("The selected product is out of stock.");
  }

  const imageUrl = productImage(product);
  if (!imageUrl) throw new Error("The selected product has no public image.");
  if (Number.isNaN(scheduledFor.getTime())) throw new Error("Invalid schedule date.");

  const platforms = Array.from(new Set(input.platforms)).filter(
    (platform): platform is SocialPlatform =>
      platform === "facebook" || platform === "instagram"
  );
  if (!platforms.length) throw new Error("Select at least one platform.");

  const supabase = createServiceRoleClient();
  const caption = buildProductCaption(product);
  const prefix = input.idempotencyPrefix || randomUUID();
  const rows = platforms.map((platform) => ({
    product_id: product.id,
    platform,
    status: input.status || "draft",
    scheduled_for: scheduledFor.toISOString(),
    caption,
    product_name: productName(product),
    price_snapshot: Math.max(0, Number(product.price) || 0),
    stock_snapshot: Math.max(0, Number(product.stock) || 0),
    image_url: imageUrl,
    product_url: productUrl(product),
    idempotency_key: `${prefix}:${platform}`,
    created_by: input.createdBy || null,
  }));

  const { data, error } = await supabase
    .from("social_post_queue")
    .insert(rows)
    .select("*");

  if (error) throw error;

  await Promise.all(
    ((data || []) as SocialPostQueueRow[]).map((row) =>
      recordEvent({
        queueId: row.id,
        eventType: "queued",
        platform: row.platform,
        details: { status: row.status, scheduledFor: row.scheduled_for },
      })
    )
  );

  return (data || []) as SocialPostQueueRow[];
}

export async function updateQueueItem(input: {
  queueId: string;
  action: "approve" | "cancel" | "retry";
  actor?: string | null;
}) {
  const supabase = createServiceRoleClient();
  const { data: current, error: readError } = await supabase
    .from("social_post_queue")
    .select("*")
    .eq("id", input.queueId)
    .single();

  if (readError || !current) throw readError || new Error("Queue item not found.");

  let changes: Record<string, unknown>;
  if (input.action === "cancel") {
    if (!["draft", "queued", "failed"].includes(current.status)) {
      throw new Error("Only draft, queued, or failed posts can be cancelled.");
    }
    changes = { status: "cancelled", locked_at: null, locked_by: null };
  } else if (input.action === "approve") {
    if (current.status !== "draft") throw new Error("Only drafts can be approved.");
    changes = { status: "queued", locked_at: null, locked_by: null };
  } else {
    if (!["failed", "skipped"].includes(current.status)) {
      throw new Error("Only failed or skipped posts can be retried.");
    }
    changes = {
      status: "queued",
      scheduled_for: new Date().toISOString(),
      locked_at: null,
      locked_by: null,
      last_error: null,
    };
  }

  const { data, error } = await supabase
    .from("social_post_queue")
    .update({ ...changes, updated_at: new Date().toISOString() })
    .eq("id", input.queueId)
    .select("*")
    .single();

  if (error || !data) throw error || new Error("Failed to update queue item.");

  await recordEvent({
    queueId: input.queueId,
    eventType: input.action,
    platform: data.platform,
    details: { actor: input.actor || null },
  });

  return data as SocialPostQueueRow;
}

function cairoClock(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CAIRO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "";

  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

function minutes(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

async function selectAutomaticProduct(settings: SocialPublisherSettings) {
  const supabase = createServiceRoleClient();
  const cutoff = new Date(
    Date.now() - settings.repeat_cooldown_days * 24 * 60 * 60 * 1000
  ).toISOString();
  const [products, activeRows, recentRows] = await Promise.all([
    listProductRows(500),
    supabase
      .from("social_post_queue")
      .select("product_id")
      .in("status", ACTIVE_QUEUE_STATUSES),
    supabase
      .from("social_post_queue")
      .select("product_id")
      .eq("status", "published")
      .gte("published_at", cutoff),
  ]);

  if (activeRows.error) throw activeRows.error;
  if (recentRows.error) throw recentRows.error;

  const excluded = new Set(
    [...(activeRows.data || []), ...(recentRows.data || [])].map((row) => row.product_id)
  );

  return (
    products
      .filter((product) => (Number(product.stock) || 0) >= settings.min_stock)
      .filter((product) => productImage(product))
      .filter((product) => !excluded.has(product.id))
      .sort((first, second) =>
        String(first.updated_at || "").localeCompare(String(second.updated_at || ""))
      )[0] || null
  );
}

async function ensureAutomaticQueue(settings: SocialPublisherSettings) {
  if (!settings.enabled || !settings.auto_queue_enabled) return null;

  const clock = cairoClock();
  const nowMinutes = minutes(clock.time);
  const eligibleSlot = settings.posting_times
    .slice(0, settings.daily_post_limit)
    .find((slot) => {
      const difference = nowMinutes - minutes(slot);
      return difference >= 0 && difference < 20;
    });

  if (!eligibleSlot) return null;

  const product = await selectAutomaticProduct(settings);
  if (!product) return null;

  const platforms: SocialPlatform[] = [];
  if (settings.facebook_enabled) platforms.push("facebook");
  if (settings.instagram_enabled) platforms.push("instagram");
  if (!platforms.length) return null;

  try {
    return await queueProductPosts({
      productId: product.id,
      platforms,
      scheduledFor: new Date().toISOString(),
      status: settings.mode === "live" ? "queued" : "draft",
      createdBy: "cron",
      idempotencyPrefix: `auto:${clock.date}:${eligibleSlot}`,
    });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "23505") return null;
    throw error;
  }
}

async function releaseStaleClaims() {
  const supabase = createServiceRoleClient();
  const cutoff = new Date(Date.now() - 20 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from("social_post_queue")
    .update({
      status: "queued",
      locked_at: null,
      locked_by: null,
      last_error: "Recovered after an interrupted worker.",
      updated_at: new Date().toISOString(),
    })
    .eq("status", "processing")
    .lt("locked_at", cutoff);

  if (error) throw error;
}

async function claimDuePost(workerId: string) {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.rpc("claim_due_social_post", {
    p_worker_id: workerId,
  });

  if (error) throw error;
  return ((data || [])[0] as SocialPostQueueRow | undefined) || null;
}

async function finishClaim(
  row: SocialPostQueueRow,
  changes: Record<string, unknown>,
  eventType: string,
  details: Record<string, unknown> = {}
) {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("social_post_queue")
    .update({
      ...changes,
      locked_at: null,
      locked_by: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", row.id)
    .eq("status", "processing");

  if (error) throw error;
  await recordEvent({
    queueId: row.id,
    eventType,
    platform: row.platform,
    details,
  });
}

async function processClaimedPost(
  row: SocialPostQueueRow,
  enabledPlatforms: SocialPlatform[]
) {
  if (!enabledPlatforms.includes(row.platform)) {
    await finishClaim(
      row,
      { status: "skipped", last_error: "Platform is disabled." },
      "skipped",
      { reason: "disabled_platform" }
    );
    return "skipped" as const;
  }

  const product = await getProductById(row.product_id);

  if (!product || product.deleted_at || !product.is_active) {
    await finishClaim(row, { status: "skipped", last_error: "Product is inactive." }, "skipped", {
      reason: "inactive_product",
    });
    return "skipped" as const;
  }

  const stock = Math.max(0, Number(product.stock) || 0);
  const imageUrl = productImage(product);
  if (stock <= 0 || !imageUrl) {
    const reason = stock <= 0 ? "out_of_stock" : "missing_public_image";
    await finishClaim(row, { status: "skipped", last_error: reason }, "skipped", { reason });
    return "skipped" as const;
  }

  const caption = buildProductCaption(product);
  const price = Math.max(0, Number(product.price) || 0);

  try {
    const result = await publishToMeta({
      platform: row.platform,
      imageUrl,
      caption,
    });

    await finishClaim(
      row,
      {
        status: "published",
        caption,
        product_name: productName(product),
        price_snapshot: price,
        stock_snapshot: stock,
        image_url: imageUrl,
        product_url: productUrl(product),
        external_post_id: result.externalPostId,
        external_post_url: result.externalPostUrl,
        published_at: new Date().toISOString(),
        last_error: null,
      },
      "published",
      { externalPostId: result.externalPostId }
    );

    return "published" as const;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Meta error";
    const canRetry = row.attempt_count < row.max_attempts;
    const retryMinutes = Math.min(60, 2 ** Math.max(1, row.attempt_count) * 5);

    await finishClaim(
      row,
      {
        status: canRetry ? "queued" : "failed",
        scheduled_for: canRetry
          ? new Date(Date.now() + retryMinutes * 60 * 1000).toISOString()
          : row.scheduled_for,
        last_error: message.slice(0, 1000),
      },
      canRetry ? "retry_scheduled" : "failed",
      { error: message.slice(0, 500), retryMinutes: canRetry ? retryMinutes : null }
    );

    return canRetry ? ("retry" as const) : ("failed" as const);
  }
}

export async function runPublisherWorker(options?: { maxPosts?: number }) {
  const settings = await getPublisherSettings();

  if (!settings.enabled) {
    return { ok: true, reason: "disabled", processed: [] as string[] };
  }

  await ensureAutomaticQueue(settings);

  if (settings.mode !== "live") {
    return { ok: true, reason: "draft_mode", processed: [] as string[] };
  }

  const enabledPlatforms: SocialPlatform[] = [];
  if (settings.facebook_enabled) enabledPlatforms.push("facebook");
  if (settings.instagram_enabled) enabledPlatforms.push("instagram");

  if (!enabledPlatforms.length) {
    return { ok: true, reason: "no_platforms", processed: [] as string[] };
  }

  const readiness = getMetaPublisherReadiness(enabledPlatforms);

  if (!readiness.configured) {
    throw new Error(`Missing Meta configuration: ${readiness.missing.join(", ")}`);
  }

  await releaseStaleClaims();
  const workerId = `worker:${randomUUID()}`;
  const processed: string[] = [];
  const maxPosts = Math.min(10, Math.max(1, options?.maxPosts || 4));

  for (let index = 0; index < maxPosts; index += 1) {
    const row = await claimDuePost(workerId);
    if (!row) break;
    processed.push(
      `${row.id}:${await processClaimedPost(row, enabledPlatforms)}`
    );
  }

  return { ok: true, reason: "completed", processed };
}
