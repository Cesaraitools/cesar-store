import crypto from "crypto";
import { getRedis } from "@/lib/infra/redis";
import { answerAutomationQuestion } from "@/lib/server/automation-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MetaMessagingEvent = {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
  };
};

type MetaFeedChange = {
  field?: string;
  value?: {
    item?: string;
    verb?: string;
    comment_id?: string;
    post_id?: string;
    parent_id?: string;
    sender_id?: string;
    from?: { id?: string; name?: string };
    message?: string;
    created_time?: number;
    permalink_url?: string;
  };
};

function textResponse(body: string, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("Content-Type", "text/plain; charset=utf-8");

  return new Response(body, { ...init, headers });
}

function getVerifyToken() {
  return (
    process.env.META_WEBHOOK_VERIFY_TOKEN ||
    process.env.META_VERIFY_TOKEN ||
    "cesar_verify_2026"
  );
}

function getPageAccessToken() {
  return process.env.META_PAGE_ACCESS_TOKEN || process.env.FACEBOOK_PAGE_ACCESS_TOKEN || "";
}

function getPageId() {
  return process.env.META_PAGE_ID || process.env.FACEBOOK_PAGE_ID || "";
}

function getGraphApiVersion() {
  return process.env.META_GRAPH_API_VERSION || "v20.0";
}

function getBaseUrl(request: Request) {
  const requestUrl = new URL(request.url);
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    `${requestUrl.protocol}//${requestUrl.host}`
  ).replace(/\/+$/, "");
}

function verifyMetaSignature(request: Request, rawBody: string) {
  const appSecret = process.env.META_APP_SECRET || "";
  if (!appSecret) return true;

  const signature = request.headers.get("x-hub-signature-256") || "";
  if (!signature.startsWith("sha256=")) return false;

  const expected =
    "sha256=" + crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex");
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  return (
    signatureBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  );
}

function extractMessagingEvents(body: any): MetaMessagingEvent[] {
  if (body?.object !== "page" || !Array.isArray(body.entry)) return [];

  return body.entry.flatMap((entry: any) =>
    Array.isArray(entry?.messaging) ? entry.messaging : []
  );
}

function extractFeedChanges(body: any): MetaFeedChange[] {
  if (body?.object !== "page" || !Array.isArray(body.entry)) return [];

  return body.entry.flatMap((entry: any) =>
    Array.isArray(entry?.changes)
      ? entry.changes.filter((change: MetaFeedChange) => change?.field === "feed")
      : []
  );
}

function summarizeWebhookBody(body: any, eventsCount: number, feedChangesCount: number) {
  return {
    object: typeof body?.object === "string" ? body.object : "unknown",
    entriesCount: Array.isArray(body?.entry) ? body.entry.length : 0,
    messagingEventsCount: eventsCount,
    feedChangesCount,
    changeFields: Array.isArray(body?.entry)
      ? body.entry
          .flatMap((entry: any) => (Array.isArray(entry?.changes) ? entry.changes : []))
          .map((change: any) => change?.field)
          .filter(Boolean)
      : [],
  };
}

function normalizeEvent(event: MetaMessagingEvent) {
  const messageText =
    typeof event.message?.text === "string" ? event.message.text.trim() : "";
  const senderId = event.sender?.id || "";
  const recipientId = event.recipient?.id || "";
  const messageId =
    event.message?.mid || `${senderId}:${event.timestamp || ""}:${messageText}`;
  const pageId = getPageId();

  if (!senderId || !recipientId) {
    return { shouldProcess: false, reason: "missing_sender_or_recipient" };
  }

  if (!messageText) {
    return { shouldProcess: false, reason: "empty_or_non_text_message" };
  }

  if (event.message?.is_echo) {
    return { shouldProcess: false, reason: "echo_message" };
  }

  if (pageId && senderId === pageId) {
    return { shouldProcess: false, reason: "page_sent_message" };
  }

  return {
    shouldProcess: true,
    reason: "ok",
    senderId,
    recipientId,
    messageId,
    messageText,
  };
}

function normalizeCommentChange(change: MetaFeedChange) {
  const value = change.value || {};
  const messageText = typeof value.message === "string" ? value.message.trim() : "";
  const actorId = value.from?.id || value.sender_id || "";
  const pageId = getPageId();
  const commentId = value.comment_id || "";
  const postId = value.post_id || value.parent_id || "";
  const eventId =
    commentId || `${postId}:${value.created_time || ""}:${messageText.slice(0, 80)}`;

  if (value.item !== "comment") {
    return { shouldProcess: false, reason: "not_a_comment" };
  }

  if (value.verb && value.verb !== "add") {
    return { shouldProcess: false, reason: "unsupported_comment_verb" };
  }

  if (!commentId || !postId) {
    return { shouldProcess: false, reason: "missing_comment_or_post_id" };
  }

  if (!messageText) {
    return { shouldProcess: false, reason: "empty_comment" };
  }

  if (pageId && actorId === pageId) {
    return { shouldProcess: false, reason: "page_comment" };
  }

  return {
    shouldProcess: true,
    reason: "ok",
    actorId,
    commentId,
    postId,
    eventId,
    messageText,
    permalinkUrl: value.permalink_url || "",
  };
}

async function markMessageSeen(messageId: string) {
  try {
    const redis = getRedis();
    const result = await redis.set(`meta:messenger:seen:${messageId}`, "1", {
      nx: true,
      ex: 24 * 60 * 60,
    });

    return result !== null;
  } catch (error) {
    console.warn("META WEBHOOK DEDUPE FAIL-OPEN:", error);
    return true;
  }
}

async function markCommentSeen(eventId: string) {
  try {
    const redis = getRedis();
    const result = await redis.set(`meta:comment:seen:${eventId}`, "1", {
      nx: true,
      ex: 7 * 24 * 60 * 60,
    });

    return result !== null;
  } catch (error) {
    console.warn("META COMMENT DEDUPE FAIL-OPEN:", error);
    return true;
  }
}

async function checkRateLimit(senderId: string) {
  try {
    const redis = getRedis();
    const now = Date.now();
    const senderKey = `meta:messenger:rate:sender:${senderId}`;
    const pageKey = "meta:messenger:rate:page";
    const senderCount = await redis.incr(senderKey);
    const pageCount = await redis.incr(pageKey);

    if (senderCount === 1) await redis.pexpire(senderKey, 10 * 60 * 1000);
    if (pageCount === 1) await redis.pexpire(pageKey, 60 * 1000);

    return {
      ok: senderCount <= 5 && pageCount <= 30,
      senderCount,
      pageCount,
      checkedAt: now,
    };
  } catch (error) {
    console.warn("META WEBHOOK RATE LIMIT FAIL-OPEN:", error);
    return { ok: true, senderCount: 0, pageCount: 0, checkedAt: Date.now() };
  }
}

async function checkCommentRateLimit(postId: string) {
  try {
    const redis = getRedis();
    const postKey = `meta:comment:rate:post:${postId}`;
    const pageKey = "meta:comment:rate:page";
    const postCount = await redis.incr(postKey);
    const pageCount = await redis.incr(pageKey);

    if (postCount === 1) await redis.pexpire(postKey, 10 * 60 * 1000);
    if (pageCount === 1) await redis.pexpire(pageKey, 60 * 1000);

    return {
      ok: postCount <= 5 && pageCount <= 20,
      postCount,
      pageCount,
      checkedAt: Date.now(),
    };
  } catch (error) {
    console.warn("META COMMENT RATE LIMIT FAIL-OPEN:", error);
    return { ok: true, postCount: 0, pageCount: 0, checkedAt: Date.now() };
  }
}

function isCommentAutoReplyEnabled() {
  return /^(1|true|yes)$/i.test(process.env.META_COMMENTS_AUTO_REPLY || "");
}

function getCommentMinimumScore() {
  const value = Number(process.env.META_COMMENTS_MIN_SCORE || 10);

  return Number.isFinite(value) ? Math.max(value, 1) : 10;
}

function getAllowedCommentPostIds() {
  return (process.env.META_COMMENTS_ALLOWED_POST_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

function isCommentPostAllowed(postId: string) {
  const allowedPostIds = getAllowedCommentPostIds();

  return !allowedPostIds.length || allowedPostIds.includes(postId);
}

async function sendFacebookMessage(recipientId: string, text: string) {
  const pageAccessToken = getPageAccessToken();

  if (!pageAccessToken) {
    console.warn("META WEBHOOK SKIPPED SEND: META_PAGE_ACCESS_TOKEN is missing");
    return { ok: false, skipped: true, status: 503 };
  }

  const response = await fetch(
    `https://graph.facebook.com/${getGraphApiVersion()}/me/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pageAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        messaging_type: "RESPONSE",
        message: { text: text.slice(0, 1900) },
      }),
    }
  );

  if (!response.ok) {
    const responseText = await response.text();
    throw new Error(`Meta send failed ${response.status}: ${responseText.slice(0, 500)}`);
  }

  return { ok: true, status: response.status };
}

async function sendFacebookCommentReply(commentId: string, text: string) {
  const pageAccessToken = getPageAccessToken();

  if (!pageAccessToken) {
    console.warn("META COMMENT SKIPPED SEND: META_PAGE_ACCESS_TOKEN is missing");
    return { ok: false, skipped: true, status: 503 };
  }

  console.info("META COMMENT SEND STARTED:", {
    commentId,
    textLength: text.length,
  });

  const response = await fetch(
    `https://graph.facebook.com/${getGraphApiVersion()}/${commentId}/comments`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pageAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: text.slice(0, 1900),
      }),
    }
  );

  if (!response.ok) {
    const responseText = await response.text();
    console.error("META COMMENT SEND FAILED:", {
      commentId,
      status: response.status,
      body: responseText.slice(0, 500),
    });
    throw new Error(
      `Meta comment reply failed ${response.status}: ${responseText.slice(0, 500)}`
    );
  }

  console.info("META COMMENT SEND COMPLETED:", {
    commentId,
    status: response.status,
  });

  return { ok: true, status: response.status };
}

async function sendFacebookCommentPrivateReply(commentId: string, text: string) {
  const pageAccessToken = getPageAccessToken();

  if (!pageAccessToken) {
    console.warn("META COMMENT PRIVATE REPLY SKIPPED: META_PAGE_ACCESS_TOKEN is missing");
    return { ok: false, skipped: true, status: 503 };
  }

  console.info("META COMMENT PRIVATE REPLY STARTED:", {
    commentId,
    textLength: text.length,
  });

  const response = await fetch(
    `https://graph.facebook.com/${getGraphApiVersion()}/${commentId}/private_replies`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pageAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: text.slice(0, 1900),
      }),
    }
  );

  if (!response.ok) {
    const responseText = await response.text();
    console.error("META COMMENT PRIVATE REPLY FAILED:", {
      commentId,
      status: response.status,
      body: responseText.slice(0, 500),
    });
    throw new Error(
      `Meta comment private reply failed ${response.status}: ${responseText.slice(0, 500)}`
    );
  }

  console.info("META COMMENT PRIVATE REPLY COMPLETED:", {
    commentId,
    status: response.status,
  });

  return { ok: true, status: response.status };
}

async function recordCommentHandoff(input: {
  reason: string;
  commentId: string;
  postId: string;
  messageText: string;
  permalinkUrl: string;
  productsCount?: number;
  bestScore?: number;
}) {
  const handoff = {
    ...input,
    createdAt: new Date().toISOString(),
  };

  console.warn("META COMMENT HUMAN HANDOFF:", handoff);

  try {
    const redis = getRedis();
    await redis.lpush("meta:comment:handoffs", JSON.stringify(handoff));
    await redis.ltrim("meta:comment:handoffs", 0, 99);
  } catch (error) {
    console.warn("META COMMENT HANDOFF STORE FAILED:", error);
  }
}

type AutomationAnswer = Awaited<ReturnType<typeof answerAutomationQuestion>>;

type MetaPostAttachment = {
  title?: string;
  description?: string;
  url?: string;
  type?: string;
  subattachments?: {
    data?: MetaPostAttachment[];
  };
};

type MetaPostContext = {
  searchText: string;
  permalinkUrl: string;
};

function collectPostAttachmentText(attachment: MetaPostAttachment, output: string[]) {
  if (attachment.title) output.push(attachment.title);
  if (attachment.description) output.push(attachment.description);
  if (attachment.url) output.push(attachment.url);

  const children = attachment.subattachments?.data || [];
  for (const child of children) {
    collectPostAttachmentText(child, output);
  }
}

function compactContextText(parts: string[]) {
  return Array.from(
    new Set(
      parts
        .map((part) => part.trim())
        .filter(Boolean)
    )
  )
    .join("\n")
    .slice(0, 1800);
}

async function fetchFacebookPostContext(postId: string): Promise<MetaPostContext | null> {
  const pageAccessToken = getPageAccessToken();
  if (!pageAccessToken) return null;

  const fields = [
    "message",
    "story",
    "permalink_url",
    "attachments{title,description,url,type,subattachments{title,description,url,type}}",
  ].join(",");
  const url = new URL(`https://graph.facebook.com/${getGraphApiVersion()}/${postId}`);
  url.searchParams.set("fields", fields);

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${pageAccessToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const responseText = await response.text();
      console.warn("META COMMENT POST CONTEXT FETCH FAILED:", {
        status: response.status,
        body: responseText.slice(0, 300),
      });
      return null;
    }

    const data = (await response.json()) as {
      message?: string;
      story?: string;
      permalink_url?: string;
      attachments?: {
        data?: MetaPostAttachment[];
      };
    };
    const parts = [data.message || "", data.story || ""];

    for (const attachment of data.attachments?.data || []) {
      collectPostAttachmentText(attachment, parts);
    }

    const searchText = compactContextText(parts);
    if (!searchText) return null;

    return {
      searchText,
      permalinkUrl: data.permalink_url || "",
    };
  } catch (error) {
    console.warn("META COMMENT POST CONTEXT FETCH ERROR:", error);
    return null;
  }
}

function shouldFetchPostContextForComment(messageText: string) {
  const normalized = messageText.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.length <= 60) return true;

  return /[?؟]|بكام|بكم|كام|السعر|سعر|متوفر|موجود|الوان|ألوان|روايح|روائح|ده|دا|دي|الصوره|الصورة|المنشور|البوست|hm|h\.m|how much|price|available/.test(
    normalized
  );
}

function buildShopUrl(baseUrl: string) {
  return `${baseUrl}/shop`;
}

function buildCategoryUrl(category: string, baseUrl: string) {
  return `${buildShopUrl(baseUrl)}?category=${encodeURIComponent(category)}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toArabicDigits(value: string) {
  const digits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

  return value.replace(/\d/g, (digit) => digits[Number(digit)] || digit);
}

function getPriceTextVariants(price: number) {
  const normalized = Number.isInteger(price)
    ? String(price)
    : price.toFixed(2).replace(/\.?0+$/, "");
  const fixed = price.toFixed(2);

  return Array.from(
    new Set([normalized, fixed, toArabicDigits(normalized), toArabicDigits(fixed)])
  ).map(escapeRegExp);
}

function stripKnownProductPrices(text: string, result: AutomationAnswer) {
  const prices = Array.from(
    new Set(
      result.products
        .map((product) => Number(product.price))
        .filter((price) => Number.isFinite(price) && price > 0)
    )
  ).sort((a, b) => String(b).length - String(a).length);

  let output = text;
  const currencyPattern = "(?:جنيه|جنيها|جنيهًا|ج\\.م|جم|ج|EGP|egp|LE|le)";

  for (const price of prices) {
    const amountPattern = `(?:${getPriceTextVariants(price).join("|")})`;

    output = output
      .replace(
        new RegExp(
          `\\s*(?:بسعر|بالسعر|سعره|سعرها|السعر|سعر)\\s*(?:هو|حاليا|حالياً|حوالي)?\\s*${amountPattern}(?:\\s*${currencyPattern})?\\.?`,
          "giu"
        ),
        ""
      )
      .replace(
        new RegExp(`\\s*[-–—]\\s*${amountPattern}\\s*${currencyPattern}\\.?`, "giu"),
        ""
      )
      .replace(
        new RegExp(`${amountPattern}\\s*${currencyPattern}\\.?`, "giu"),
        ""
      );
  }

  return output
    .replace(/^\s*(?:[-*•]\s*)?(?:\*\*)?\s*(?:السعر|سعره|سعرها|price)\s*(?:\*\*)?\s*:?.*$/gimu, "")
    .replace(/\s*(?:[-*•]\s*)?(?:\*\*)?\s*(?:السعر|سعره|سعرها|price)\s*(?:\*\*)?\s*:?\s*(?:اطلب(?:ه|ها)?\s*)?الآن\.?/gimu, "")
    .replace(/\s*(?:[-*•]\s*)?(?:\*\*)?\s*(?:السعر|سعره|سعرها|price)\s*(?:\*\*)?\s*:?\s*$/gimu, "")
    .replace(/\s+([:،,؛.])/g, "$1")
    .replace(/-\s*:/g, ":")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isPublicDetailQuestion(messageText: string) {
  const normalized = messageText.trim().toLowerCase();

  return /تفاصيل|التفاصيل|مواصفات|المواصفات|وصف|الوصف|لون|ألوان|الوان|نوع|النوع|موديل|مقاس|مقاسات|حجم|احجام|أحجام|ريحة|ريحه|رائحة|رائحه|روايح|روائح|خامة|خامه|استخدام|يستخدم|ينفع|يركب|مناسب|فرق|الفرق|color|colour|size|type|model|scent|details|description|specs/.test(
    normalized
  );
}

function isPostDependentComment(messageText: string) {
  const normalized = messageText.trim().toLowerCase();

  return /تفاصيل|التفاصيل|وصف|الوصف|بكام|بكم|كام|السعر|سعر|سعره|سعرها|متوفر|موجود|ده|دا|دي|الصوره|الصورة|المنشور|البوست|\?|؟|hm|h\.m|how much|price|details|available/.test(
    normalized
  );
}

const POST_CONTEXT_MATCH_STOP_WORDS = new Set([
  "المنتج",
  "منتج",
  "منتجات",
  "السياره",
  "سياره",
  "السيارات",
  "سيارات",
  "العربيه",
  "عربيه",
  "اكسسوارات",
  "اكسسوار",
  "معدات",
  "فئه",
  "قسم",
  "متاح",
  "متوفر",
  "سعر",
  "السعر",
  "تفاصيل",
  "وصف",
  "هنا",
  "من",
  "في",
  "على",
  "مع",
  "هذا",
  "هذه",
  "ده",
  "دا",
  "دي",
  "car",
  "cars",
  "auto",
  "product",
  "products",
  "price",
  "details",
]);

const POST_CONTEXT_CATEGORY_KEYWORDS: Record<string, string[]> = {
  "air-fresheners": [
    "معطر",
    "معطرات",
    "فواحه",
    "فواحة",
    "فواحات",
    "مبخره",
    "مبخرة",
    "مباخر",
    "رائحه",
    "رائحة",
    "ريحه",
    "ريحة",
    "روائح",
    "freshener",
    "air freshener",
    "perfume",
    "scent",
  ],
  detergent: [
    "منظف",
    "منظفات",
    "تنظيف",
    "شامبو",
    "فوم",
    "واكس",
    "بولش",
    "تلميع",
    "تابلوه",
    "داشبورد",
    "ملمع",
    "ملمعات",
    "ملمع تابلوه",
    "ملمع كاوتش",
    "ملمع اطارات",
    "ملمع إطارات",
    "منظف زجاج",
    "منظف فرش",
    "منظف جلد",
    "منظف داخلي",
    "منظف خارجي",
    "غسيل",
    "اسبراي",
    "سبراي",
    "اطارات",
    "إطارات",
    "كاوتش",
    "زجاج",
    "جلد",
    "فرش",
    "حماية",
    "cleaner",
    "detergent",
    "shampoo",
    "foam",
    "wax",
    "polish",
    "dashboard polish",
    "tire shine",
    "tyre shine",
    "glass cleaner",
    "interior cleaner",
    "exterior cleaner",
    "leather cleaner",
    "upholstery cleaner",
    "spray",
    "car wash",
  ],
  "cars-accessories": [
    "اكسسوار",
    "اكسسوارات",
    "إكسسوار",
    "إكسسوارات",
    "حامل",
    "منظم",
    "مخده",
    "مخدة",
    "رقبه",
    "رقبة",
    "ماكت",
    "ماكيت",
    "مجسم",
    "مجسمات",
    "مصغر",
    "مصغره",
    "مصغرة",
    "سيارات مصغره",
    "سيارات مصغرة",
    "طبق الاصل",
    "طبق الأصل",
    "model car",
    "model cars",
    "diecast",
    "miniature",
    "accessory",
    "accessories",
    "holder",
    "organizer",
  ],
  "cars-lights": [
    "لمبه",
    "لمبة",
    "لمبات",
    "ليد",
    "إضاءة",
    "اضاءه",
    "اضاءة",
    "نور",
    "كشاف",
    "زينون",
    "فوج",
    "شبوره",
    "شبورة",
    "اشاره",
    "إشارة",
    "نور داخلي",
    "نور صالون",
    "ستروب",
    "شريط ليد",
    "ليدات",
    "h1",
    "h4",
    "h7",
    "t10",
    "9005",
    "9006",
    "led",
    "light",
    "lights",
    "bulb",
    "fog light",
    "headlight",
    "tail light",
    "turn signal",
    "interior light",
    "led strip",
    "xenon",
  ],
  equipment: [
    "عده",
    "عدة",
    "اداه",
    "أداة",
    "ادوات",
    "أدوات",
    "معدات",
    "كمبروسر",
    "كومبروسر",
    "منفاخ",
    "كابل",
    "بطاريه",
    "بطارية",
    "واير",
    "جر",
    "سلك",
    "اسلاك",
    "أسلاك",
    "وصله",
    "وصلة",
    "اشتراك",
    "كابل بطاريه",
    "كابل بطارية",
    "وصلة بطاريه",
    "وصلة بطارية",
    "منفاخ اطارات",
    "منفاخ إطارات",
    "ضغط كاوتش",
    "عداد ضغط",
    "مقياس ضغط",
    "واير جر",
    "حبل جر",
    "ونش",
    "كوريك",
    "رافعه",
    "رافعة",
    "طوارئ",
    "مثلث",
    "tool",
    "tools",
    "equipment",
    "compressor",
    "jumper",
    "tow",
    "air pump",
    "inflator",
    "air compressor",
    "jump starter",
    "jumper cable",
    "battery cable",
    "tow rope",
    "tire pressure",
    "pressure gauge",
    "jack",
    "emergency",
  ],
  "additives-fluids": [
    "سائل",
    "سوائل",
    "اضافه",
    "إضافة",
    "اضافات",
    "إضافات",
    "زيت",
    "بنزين",
    "اوكتان",
    "أوكتان",
    "رشاشات",
    "مساحات",
    "ردياتير",
    "مبرد",
    "تبريد",
    "مياه مساحات",
    "ماء مساحات",
    "منظف رشاشات",
    "رشاش",
    "رشاشات بنزين",
    "منظف بنزين",
    "محسن بنزين",
    "مانع تسريب",
    "مانع صدأ",
    "صدأ",
    "فرامل",
    "باور",
    "فتيس",
    "fluid",
    "fluids",
    "additive",
    "additives",
    "octane",
    "injector",
    "coolant",
    "radiator",
    "washer fluid",
    "windshield washer",
    "fuel additive",
    "octane booster",
    "injector cleaner",
    "brake fluid",
    "power steering",
    "transmission fluid",
    "anti leak",
    "rust remover",
  ],
};

function normalizePostContextMatchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[\u064b-\u065f\u0670]/g, "")
    .replace(/[\u0625\u0623\u0622\u0627]/g, "\u0627")
    .replace(/\u0649/g, "\u064a")
    .replace(/\u0629/g, "\u0647")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatErrorForLog(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack?.slice(0, 500),
    };
  }

  return error;
}

function postContextTokens(value: string) {
  return Array.from(
    new Set(
      normalizePostContextMatchText(value)
        .split(" ")
        .map((token) => token.trim())
        .filter(
          (token) =>
            token.length > 2 && !POST_CONTEXT_MATCH_STOP_WORDS.has(token)
        )
    )
  );
}

function hasConfidentPostProductMatch(result: AutomationAnswer, postContext: string) {
  const firstProduct = result.products[0];
  if (!firstProduct || !postContext.trim()) return false;

  const normalizedContext = normalizePostContextMatchText(postContext);
  const productUrl = normalizePostContextMatchText(firstProduct.productUrl || "");
  const productId = normalizePostContextMatchText(firstProduct.id || "");
  if (productUrl && normalizedContext.includes(productUrl)) return true;
  if (productId && normalizedContext.includes(productId)) return true;

  const productTokens = postContextTokens(
    `${firstProduct.name} ${firstProduct.nameAr} ${firstProduct.nameEn}`
  );
  const overlappingTokens = productTokens.filter((token) =>
    normalizedContext.includes(token)
  );

  return (
    overlappingTokens.length >= 2 ||
    overlappingTokens.some((token) => token.length >= 6 || /\d/.test(token))
  );
}

function hasConfidentPostCategoryMatch(result: AutomationAnswer, postContext: string) {
  if (!postContext.trim() || !result.products.length) return false;

  const category = result.meta.matchedCategory || result.products[0]?.category || "";
  if (!category) return false;

  const keywords = POST_CONTEXT_CATEGORY_KEYWORDS[category] || [];
  if (!keywords.length) return false;

  const normalizedContext = normalizePostContextMatchText(postContext);
  const matchedKeyword = keywords.some((keyword) => {
    const normalizedKeyword = normalizePostContextMatchText(keyword);
    return Boolean(normalizedKeyword) && normalizedContext.includes(normalizedKeyword);
  });

  if (!matchedKeyword) return false;

  return result.products.some((product) => product.category === category);
}

function hasConfidentPostContextMatch(result: AutomationAnswer, postContext: string) {
  return (
    hasConfidentPostProductMatch(result, postContext) ||
    hasConfidentPostCategoryMatch(result, postContext)
  );
}

function shouldSendPrivatePriceReply(result: AutomationAnswer) {
  return (
    result.meta.autoReply === "answer" &&
    result.products.some((product) => Number(product.price) > 0)
  );
}

function buildFacebookPrivatePriceReply(result: AutomationAnswer) {
  const products = result.products
    .filter((product) => Number(product.price) > 0)
    .slice(0, 3);

  if (!products.length) return "";

  if (products.length === 1) {
    const product = products[0];

    return `سعر ${product.name} حاليا ${product.price} جنيه.\nالطلب من هنا: ${product.productUrl}\n\nلو محتاج تفاصيل أكتر ابعتلنا رسالة.`;
  }

  return [
    "أسعار أقرب المنتجات لسؤالك:",
    ...products.map(
      (product) => `- ${product.name}: ${product.price} جنيه\n${product.productUrl}`
    ),
    "",
    "لو محتاج تفاصيل أكتر ابعتلنا رسالة.",
  ].join("\n");
}

function buildConciseFacebookProductReply(result: AutomationAnswer) {
  const products = result.products.slice(0, 3);
  if (!products.length) return result.suggestedReply.trim();

  if (products.length === 1) {
    return `المنتج الأقرب لسؤالك: ${products[0].name}.\nاطلبه من هنا: ${products[0].productUrl}`;
  }

  return [
    "أقرب المنتجات لسؤالك:",
    ...products.map((product) => `- ${product.name}\n${product.productUrl}`),
  ].join("\n");
}

function buildPublicProductFallback(result: AutomationAnswer) {
  const first = result.products[0];

  if (!first) return result.suggestedReply.trim();

  return `${first.name} متوفر حاليا.\nالطلب من هنا: ${first.productUrl}`;
}

function buildFacebookUncertainPostReply(baseUrl: string) {
  return [
    "محتاجين تأكيد المنتج المقصود في المنشور عشان نرد عليك بدقة.",
    "ابعتلنا رسالة بصورة المنتج أو اكتب اسمه، وهنبعتلك التفاصيل.",
    "",
    `الموقع: ${buildShopUrl(baseUrl)}`,
  ].join("\n");
}

function buildFacebookCommentReply(
  result: AutomationAnswer,
  baseUrl: string,
  messageText: string,
  options?: { privatePriceSent?: boolean }
) {
  const shouldMovePricePrivate = shouldSendPrivatePriceReply(result);
  const shouldUseDetailedPublicReply = isPublicDetailQuestion(messageText);
  const cleanSuffix =
    result.meta.autoReply === "clarify"
      ? "\n\nلو تحب ابعتلنا رسالة بصورة المنتج أو تفاصيل أكتر."
      : "";

  const publicReply = shouldMovePricePrivate
    ? shouldUseDetailedPublicReply
      ? stripKnownProductPrices(result.suggestedReply, result)
      : buildConciseFacebookProductReply(result)
    : result.suggestedReply.trim();
  const reply = publicReply || buildPublicProductFallback(result);
  const category = result.products[0]?.category || result.meta.matchedCategory || "";
  const categoryUrl = category ? buildCategoryUrl(category, baseUrl) : "";
  const shopUrl = buildShopUrl(baseUrl);
  const links = [
    categoryUrl && !reply.includes(categoryUrl) ? `شوف القسم من هنا: ${categoryUrl}` : "",
    !reply.includes(shopUrl) ? `الموقع: ${shopUrl}` : "",
  ].filter(Boolean);
  const priceNote = shouldMovePricePrivate
    ? options?.privatePriceSent
      ? "بعتنالك التفاصيل في الخاص."
      : "لو رسالة الخاص ما ظهرتش عندك، ابعتلنا رسالة وهنبعتلك التفاصيل فوراً."
    : "";

  return `${reply}${links.length ? `\n\n${links.join("\n")}` : ""}${
    priceNote ? `\n\n${priceNote}` : ""
  }${cleanSuffix}`;
}

async function processEvent(event: MetaMessagingEvent, request: Request) {
  const normalized = normalizeEvent(event);

  if (!normalized.shouldProcess) {
    return { processed: false, reason: normalized.reason };
  }

  if (!(await markMessageSeen(normalized.messageId))) {
    return { processed: false, reason: "duplicate_message" };
  }

  const rate = await checkRateLimit(normalized.senderId);
  if (!rate.ok) {
    return { processed: false, reason: "rate_limited" };
  }

  const result = await answerAutomationQuestion({
    query: normalized.messageText,
    requestedLanguage: "ar",
    limit: 3,
    baseUrl: getBaseUrl(request),
  });

  await sendFacebookMessage(normalized.senderId, result.suggestedReply);

  return {
    processed: true,
    reason: "reply_sent",
    productsCount: result.products.length,
  };
}

async function processCommentChange(change: MetaFeedChange, request: Request) {
  const normalized = normalizeCommentChange(change);

  if (!normalized.shouldProcess) {
    return { processed: false, reason: normalized.reason };
  }

  if (!(await markCommentSeen(normalized.eventId))) {
    return { processed: false, reason: "duplicate_comment" };
  }

  const rate = await checkCommentRateLimit(normalized.postId);
  if (!rate.ok) {
    await recordCommentHandoff({
      reason: "rate_limited",
      commentId: normalized.commentId,
      postId: normalized.postId,
      messageText: normalized.messageText,
      permalinkUrl: normalized.permalinkUrl,
    });

    return { processed: false, reason: "rate_limited" };
  }

  if (!isCommentPostAllowed(normalized.postId)) {
    await recordCommentHandoff({
      reason: "comment_post_not_allowed",
      commentId: normalized.commentId,
      postId: normalized.postId,
      messageText: normalized.messageText,
      permalinkUrl: normalized.permalinkUrl,
    });

    return { processed: false, reason: "comment_post_not_allowed" };
  }

  const baseUrl = getBaseUrl(request);
  const baseAutomationInput = {
    query: normalized.messageText,
    requestedLanguage: "ar",
    limit: 3,
    baseUrl,
  };
  let result = await answerAutomationQuestion({
    ...baseAutomationInput,
    skipAi: true,
  });
  let postContextUsed = false;
  let postContextSearchText = "";

  if (result.meta.handoffReason === "human_sensitive_request") {
    await recordCommentHandoff({
      reason: result.meta.handoffReason,
      commentId: normalized.commentId,
      postId: normalized.postId,
      messageText: normalized.messageText,
      permalinkUrl: normalized.permalinkUrl,
      productsCount: result.products.length,
      bestScore: result.meta.bestScore,
    });

    return {
      processed: false,
      reason: result.meta.handoffReason,
      productsCount: result.products.length,
      bestScore: result.meta.bestScore,
      postContextUsed,
      aiUsed: result.meta.ai.used,
      aiAction: result.meta.ai.action,
      aiReason: result.meta.ai.reason,
    };
  }

  if (
    result.meta.handoffReason === "post_context_required" ||
    shouldFetchPostContextForComment(normalized.messageText)
  ) {
    const postContext = await fetchFacebookPostContext(normalized.postId);

    if (postContext?.searchText) {
      postContextUsed = true;
      postContextSearchText = postContext.searchText;
      normalized.permalinkUrl = normalized.permalinkUrl || postContext.permalinkUrl;

      console.info("META COMMENT POST CONTEXT USED:", {
        commentId: normalized.commentId,
        postId: normalized.postId,
        contextLength: postContext.searchText.length,
        bestScore: result.meta.bestScore,
        autoReply: result.meta.autoReply,
        handoffReason: result.meta.handoffReason,
      });
    }
  }

  result = await answerAutomationQuestion({
    query: normalized.messageText,
    contextQuery: postContextSearchText,
    handoffQuery: normalized.messageText,
    requestedLanguage: "ar",
    limit: 3,
    baseUrl,
  });

  console.info("META COMMENT AUTOMATION DECISION:", {
    commentId: normalized.commentId,
    postId: normalized.postId,
    productsCount: result.products.length,
    bestScore: result.meta.bestScore,
    autoReply: result.meta.autoReply,
    handoffReason: result.meta.handoffReason,
    postContextUsed,
    aiUsed: result.meta.ai.used,
    aiAction: result.meta.ai.action,
    aiReason: result.meta.ai.reason,
  });

  if (!isCommentAutoReplyEnabled()) {
    await recordCommentHandoff({
      reason: "comment_auto_reply_disabled",
      commentId: normalized.commentId,
      postId: normalized.postId,
      messageText: normalized.messageText,
      permalinkUrl: normalized.permalinkUrl,
      productsCount: result.products.length,
      bestScore: result.meta.bestScore,
    });

    return {
      processed: false,
      reason: "comment_auto_reply_disabled",
      productsCount: result.products.length,
      bestScore: result.meta.bestScore,
      postContextUsed,
      aiUsed: result.meta.ai.used,
      aiAction: result.meta.ai.action,
      aiReason: result.meta.ai.reason,
    };
  }

  const shouldHandoff =
    result.meta.autoReply === "handoff" ||
    (!result.meta.ai.used &&
      result.meta.autoReply === "answer" &&
      (!result.products.length || result.meta.bestScore < getCommentMinimumScore()));

  if (shouldHandoff) {
    const handoffReason =
      result.meta.handoffReason || "low_confidence_product_match";

    await recordCommentHandoff({
      reason: handoffReason,
      commentId: normalized.commentId,
      postId: normalized.postId,
      messageText: normalized.messageText,
      permalinkUrl: normalized.permalinkUrl,
      productsCount: result.products.length,
      bestScore: result.meta.bestScore,
    });

    return {
      processed: false,
      reason: handoffReason,
      productsCount: result.products.length,
      bestScore: result.meta.bestScore,
      postContextUsed,
      aiUsed: result.meta.ai.used,
      aiAction: result.meta.ai.action,
      aiReason: result.meta.ai.reason,
    };
  }

  if (
    postContextUsed &&
    isPostDependentComment(normalized.messageText) &&
    result.meta.autoReply === "answer" &&
    result.products.length &&
    !hasConfidentPostContextMatch(result, postContextSearchText)
  ) {
    await recordCommentHandoff({
      reason: "post_context_product_uncertain",
      commentId: normalized.commentId,
      postId: normalized.postId,
      messageText: normalized.messageText,
      permalinkUrl: normalized.permalinkUrl,
      productsCount: result.products.length,
      bestScore: result.meta.bestScore,
    });

    await sendFacebookCommentReply(
      normalized.commentId,
      buildFacebookUncertainPostReply(baseUrl)
    );

    return {
      processed: true,
      reason: "post_context_product_uncertain",
      productsCount: result.products.length,
      bestScore: result.meta.bestScore,
      postContextUsed,
      aiUsed: result.meta.ai.used,
      aiAction: result.meta.ai.action,
      aiReason: result.meta.ai.reason,
    };
  }

  let privatePriceAttempted = false;
  let privatePriceSent = false;
  const privatePriceReply = shouldSendPrivatePriceReply(result)
    ? buildFacebookPrivatePriceReply(result)
    : "";

  if (privatePriceReply) {
    privatePriceAttempted = true;

    try {
      await sendFacebookCommentPrivateReply(normalized.commentId, privatePriceReply);
      privatePriceSent = true;
    } catch (error) {
      console.error("META COMMENT PRIVATE PRICE SEND ERROR:", {
        commentId: normalized.commentId,
        postId: normalized.postId,
        error: formatErrorForLog(error),
      });
    }
  }

  await sendFacebookCommentReply(
    normalized.commentId,
    buildFacebookCommentReply(result, baseUrl, normalized.messageText, {
      privatePriceSent,
    })
  );

  return {
    processed: true,
    reason:
      result.meta.autoReply === "clarify"
        ? "comment_clarification_sent"
        : "comment_reply_sent",
    productsCount: result.products.length,
    bestScore: result.meta.bestScore,
    postContextUsed,
    aiUsed: result.meta.ai.used,
    aiAction: result.meta.ai.action,
    aiReason: result.meta.ai.reason,
    privatePriceAttempted,
    privatePriceSent,
  };

}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const mode = requestUrl.searchParams.get("hub.mode") || "";
  const token = requestUrl.searchParams.get("hub.verify_token") || "";
  const challenge = requestUrl.searchParams.get("hub.challenge") || "";

  if (mode === "subscribe" && token === getVerifyToken()) {
    return textResponse(challenge);
  }

  return textResponse("VERIFICATION_FAILED", { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  if (!verifyMetaSignature(request, rawBody)) {
    return textResponse("INVALID_SIGNATURE", { status: 403 });
  }

  try {
    const body = rawBody.trim() ? JSON.parse(rawBody) : {};
    const events = extractMessagingEvents(body);
    const feedChanges = extractFeedChanges(body);

    console.info(
      "META WEBHOOK POST RECEIVED:",
      summarizeWebhookBody(body, events.length, feedChanges.length)
    );

    for (const event of events) {
      try {
        await processEvent(event, request);
      } catch (error) {
        console.error("META WEBHOOK EVENT ERROR:", error);
      }
    }

    for (const change of feedChanges) {
      try {
        const result = await processCommentChange(change, request);
        console.info("META WEBHOOK COMMENT RESULT:", result);
      } catch (error) {
        console.error("META WEBHOOK COMMENT ERROR:", error);
      }
    }

    return textResponse("EVENT_RECEIVED");
  } catch (error) {
    console.error("META WEBHOOK ERROR:", error);
    return textResponse("EVENT_RECEIVED");
  }
}
