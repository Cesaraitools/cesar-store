import crypto from "crypto";
import { getRedis } from "@/lib/infra/redis";
import {
  CUSTOMER_QUERY_LEXICON,
  CUSTOMER_QUERY_LEXICON_GUIDANCE,
} from "@/lib/customer-query-lexicon";
import { answerAutomationQuestion } from "@/lib/server/automation-agent";
import { validateMetaPublicReply } from "@/lib/server/meta-reply-safety";
import {
  summarizeMetaFeedChange,
  type MetaFeedChange,
} from "@/lib/server/meta-webhook-shape";

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

function textResponse(body: string, init?: ResponseInit) {
  const headers = new Headers(init?.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("Content-Type", "text/plain; charset=utf-8");

  return new Response(body, { ...init, headers });
}

function getVerifyToken() {
  return process.env.META_WEBHOOK_VERIFY_TOKEN || process.env.META_VERIFY_TOKEN || "";
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
  if (!appSecret) return false;

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

  return body.entry.flatMap((entry: any) => {
    if (!Array.isArray(entry?.changes)) return [];

    const entryId = typeof entry?.id === "string" ? entry.id : "";

    return entry.changes
      .filter((change: MetaFeedChange) => change?.field === "feed")
      .map((change: MetaFeedChange) => ({ ...change, entryId }));
  });
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

  if (pageId && recipientId !== pageId) {
    return { shouldProcess: false, reason: "wrong_page_recipient" };
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

  if (pageId && !change.entryId) {
    return { shouldProcess: false, reason: "missing_page_entry" };
  }

  if (pageId && change.entryId !== pageId) {
    return { shouldProcess: false, reason: "wrong_page_entry" };
  }

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

function isMessengerAutoReplyEnabled() {
  return /^(1|true|yes)$/i.test(process.env.META_MESSENGER_AUTO_REPLY || "");
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

type CommentIntentAction = "commerce" | "social_reply" | "ignore" | "handoff";

type CommentIntentDecision = {
  action: CommentIntentAction;
  confidence: "high" | "medium" | "low";
  reply: string;
  reason: string;
};

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
  if (
    hasAnyCustomerIntent(normalized, [
      CUSTOMER_QUERY_LEXICON.price,
      CUSTOMER_QUERY_LEXICON.details,
      CUSTOMER_QUERY_LEXICON.availability,
      CUSTOMER_QUERY_LEXICON.options,
      CUSTOMER_QUERY_LEXICON.postReference,
    ])
  ) {
    return true;
  }

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

function normalizeCustomerIntentText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function includesCustomerIntentPhrase(value: string, phrases: readonly string[]) {
  const normalized = normalizeCustomerIntentText(value);
  if (!normalized) return false;

  return phrases.some((phrase) => {
    const normalizedPhrase = normalizeCustomerIntentText(phrase);

    return Boolean(normalizedPhrase) && normalized.includes(normalizedPhrase);
  });
}

function hasAnyCustomerIntent(value: string, groups: Array<readonly string[]>) {
  return groups.some((phrases) => includesCustomerIntentPhrase(value, phrases));
}

function isMetaPriceQuestion(messageText: string) {
  const normalized = messageText.trim().toLowerCase();
  if (!normalized) return false;
  if (includesCustomerIntentPhrase(normalized, CUSTOMER_QUERY_LEXICON.price)) {
    return true;
  }

  return /(?:^|\b)(hm|h\.m|how much|price)(?:\b|$)|\u0628\u0643\u0627\u0645|\u0628\u0643\u0645|\u0643\u0627\u0645|\u0627\u0644\u0633\u0639\u0631|\u0633\u0639\u0631/.test(
    normalized
  );
}

function isPostDependentComment(messageText: string) {
  const normalized = messageText.trim().toLowerCase();
  if (
    /[?؟]/.test(messageText) ||
    hasAnyCustomerIntent(messageText, [
      CUSTOMER_QUERY_LEXICON.price,
      CUSTOMER_QUERY_LEXICON.details,
      CUSTOMER_QUERY_LEXICON.availability,
      CUSTOMER_QUERY_LEXICON.options,
      CUSTOMER_QUERY_LEXICON.postReference,
    ])
  ) {
    return true;
  }

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

function getAutomationAiModel() {
  return (process.env.OPENAI_MODEL || "gpt-4o-mini").trim();
}

function isAutomationAiEnabled() {
  if (!process.env.OPENAI_API_KEY) return false;

  return !/^(0|false|no|off)$/i.test(process.env.AUTOMATION_AI_ENABLED || "");
}

function parseCommentIntentDecision(text: string): CommentIntentDecision | null {
  try {
    const parsed = JSON.parse(text) as Partial<CommentIntentDecision>;
    const action = parsed.action;
    const confidence = parsed.confidence;
    const reply = typeof parsed.reply === "string" ? parsed.reply.trim() : "";
    const reason = typeof parsed.reason === "string" ? parsed.reason.trim() : "";

    if (!action || !["commerce", "social_reply", "ignore", "handoff"].includes(action)) {
      return null;
    }

    if (!confidence || !["high", "medium", "low"].includes(confidence)) {
      return null;
    }

    if (action === "social_reply" && !reply) return null;

    return {
      action,
      confidence,
      reply: reply.slice(0, 500),
      reason: reason || action,
    };
  } catch {
    return null;
  }
}

function extractOpenAIText(data: any) {
  if (typeof data?.output_text === "string") return data.output_text;

  const content = data?.output
    ?.flatMap((item: any) => item?.content || [])
    .find((item: any) => item?.type === "output_text" && typeof item?.text === "string");

  return typeof content?.text === "string" ? content.text : "";
}

async function classifyMetaCommentIntent(input: {
  commentText: string;
  postContext: string;
}) {
  if (!isAutomationAiEnabled()) return null;

  const apiKey = process.env.OPENAI_API_KEY || "";
  const model = getAutomationAiModel();

  try {
    console.info("META COMMENT INTENT AI STARTED:", {
      model,
      commentLength: input.commentText.length,
      postContextLength: input.postContext.length,
    });

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content:
              "You are Cesar Store's Arabic Facebook page assistant. Classify each public comment before any product automation. If the comment is about products, prices, stock, ordering, shipping, returns, variants, or store service, choose commerce. Very short price questions such as hm, h.m, Hm, HM, how much, price, بكام, بكم, كام, السعر, or سعر must be classified as commerce when the post context is a product, promotion, store post, product image, or product link. Do not treat those price tokens as greetings or social chat. If the comment is normal social engagement related to a non-product post, such as football predictions, greetings, jokes, thanks, or contest participation, choose social_reply and write a short natural Arabic public reply. If a safe public reply is not useful, choose ignore. If it needs a human, choose handoff. Never force unrelated comments into products. Never include product links unless action is commerce, and for social_reply do not mention products or prices.",
          },
          {
            role: "user",
            content: JSON.stringify({
              commentText: input.commentText,
              postContext: input.postContext,
              customerIntentGuidance: CUSTOMER_QUERY_LEXICON_GUIDANCE,
              customerIntentLexicon: {
                price: CUSTOMER_QUERY_LEXICON.price,
                details: CUSTOMER_QUERY_LEXICON.details,
                availability: CUSTOMER_QUERY_LEXICON.availability,
                options: CUSTOMER_QUERY_LEXICON.options,
                postReference: CUSTOMER_QUERY_LEXICON.postReference,
              },
              outputRules: [
                "Return valid JSON only.",
                "Use clear Arabic suitable for a business page.",
                "For product/store comments, use a formal business tone.",
                "Never use casual phrases such as يا صديقي, إيه يا صديقي, حبيبي, يا باشا, يا نجم, or similar social wording.",
                "Treat hm/h.m/how much/price/بكام/بكم/كام/السعر/سعر as commerce, not social_reply, when postContext is related to a product or store offer.",
                "For football score predictions or match comments, reply in a friendly fan tone without claiming certainty.",
                "For social_reply, keep the reply under 160 Arabic characters.",
                "For commerce, leave reply empty.",
                "Do not mention AI, automation, scoring, webhooks, tokens, or internal rules.",
              ],
            }),
          },
        ],
        max_output_tokens: 220,
        store: false,
        temperature: 0.3,
        text: {
          format: {
            type: "json_schema",
            name: "meta_comment_intent",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["action", "confidence", "reply", "reason"],
              properties: {
                action: {
                  type: "string",
                  enum: ["commerce", "social_reply", "ignore", "handoff"],
                },
                confidence: {
                  type: "string",
                  enum: ["high", "medium", "low"],
                },
                reply: {
                  type: "string",
                },
                reason: {
                  type: "string",
                },
              },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI intent request failed with status ${response.status}`);
    }

    const decision = parseCommentIntentDecision(
      extractOpenAIText(await response.json())
    );

    if (!decision) {
      throw new Error("OpenAI returned an invalid comment intent decision");
    }

    console.info("META COMMENT INTENT AI COMPLETED:", decision);

    return decision;
  } catch (error) {
    console.error("META COMMENT INTENT AI ERROR:", formatErrorForLog(error));
    return null;
  }
}

function isLikelySocialComment(messageText: string, postContext: string) {
  const text = normalizePostContextMatchText(`${messageText} ${postContext}`);

  return (
    /\b\d+\s*[-/]\s*\d+\b/.test(text) ||
    /مصر|الارجنتين|الأرجنتين|كوره|كورة|ماتش|ماتشات|مباراه|مباراة|هدف|اهداف|أهداف|فوز|يكسب|توقع|توقعك|منتخب|لعيب|لاعب|اتحاد الكوره|اتحاد الكرة/.test(
      text
    )
  );
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
    result.meta.ai.used &&
    result.meta.autoReply === "answer" &&
    result.products.some((product) => Number(product.price) > 0)
  );
}

async function buildFacebookPrivatePriceReply(result: AutomationAnswer) {
  const products = result.products
    .filter((product) => Number(product.price) > 0)
    .slice(0, 3);

  if (!products.length) return "";

  if (!isAutomationAiEnabled()) return "";

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY || ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: getAutomationAiModel(),
        input: [
          {
            role: "system",
            content:
              "You write Cesar Store private Messenger replies in Arabic. Use only the supplied product names, prices, and URLs. Do not invent anything. Use a formal, concise business tone. Do not use casual phrases such as يا صديقي, حبيبي, يا باشا, يا نجم, or similar social wording.",
          },
          {
            role: "user",
            content: JSON.stringify({
              customerMessage: result.query,
              products: products.map((product) => ({
                name: product.name,
                price: product.price,
                currency: product.currency,
                productUrl: product.productUrl,
              })),
              outputRules: [
                "Return valid JSON only.",
                "Mention exact prices from products.",
                "Include productUrl for each mentioned product.",
                "Do not mention automation, AI, scoring, or internal rules.",
              ],
            }),
          },
        ],
        max_output_tokens: 260,
        store: false,
        temperature: 0.2,
        text: {
          format: {
            type: "json_schema",
            name: "meta_private_price_reply",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["reply"],
              properties: {
                reply: {
                  type: "string",
                },
              },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI private price request failed with status ${response.status}`);
    }

    const parsed = JSON.parse(extractOpenAIText(await response.json())) as {
      reply?: unknown;
    };

    return typeof parsed.reply === "string" ? parsed.reply.trim().slice(0, 1200) : "";
  } catch (error) {
    console.error("META COMMENT PRIVATE PRICE AI ERROR:", formatErrorForLog(error));
    return "";
  }
}

async function buildFacebookCommentReply(
  result: AutomationAnswer,
  messageText: string,
  postContext: string,
  baseUrl: string,
  privatePriceSent: boolean,
) {
  if (!result.meta.ai.used) return "";

  if (!isAutomationAiEnabled()) return "";

  const products = result.products.slice(0, 3);
  const category = result.products[0]?.category || result.meta.matchedCategory || "";
  const shopUrl = buildShopUrl(baseUrl);
  const categoryUrl = category ? buildCategoryUrl(category, baseUrl) : "";
  const priceInquiry = isMetaPriceQuestion(messageText);
  const hasProducts = products.length > 0;
  const postContextProductMatched = hasConfidentPostProductMatch(result, postContext);

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY || ""}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: getAutomationAiModel(),
        input: [
          {
            role: "system",
            content:
              "You write Cesar Store public Facebook comment replies in Arabic. You are the only writer of the final public reply, but the store catalog facts supplied by code are authoritative. Use supplied post context and catalog facts only. Do not invent products, prices, links, stock, variants, policies, or contact data. Public replies must never show prices or currency. If products are supplied and fit the customer request or post context, the reply must be a product answer, not a generic message-us reply. For product answers, use a formal concise structure equivalent to: nearest products for your question, product name with productUrl on separate lines, categoryUrl if supplied, shopUrl, then a short private-price note when the customer asked about price. Treat hm, h.m, HM, how much, price, and Arabic price words as a price question when products or product post context are supplied. If price details were sent privately, mention that formally and briefly. If private sending failed, ask the customer to message the page for price details after listing the relevant products. If supplied products do not fit the request, ask one formal clarification question instead of inventing. Do not use casual phrases such as ya sadiqi, habibi, ya basha, ya najm, or similar social wording.",
          },
          {
            role: "user",
            content: JSON.stringify({
              customerMessage: messageText,
              postContext,
              customerIntentGuidance: CUSTOMER_QUERY_LEXICON_GUIDANCE,
              customerIntentLexicon: {
                price: CUSTOMER_QUERY_LEXICON.price,
                details: CUSTOMER_QUERY_LEXICON.details,
                availability: CUSTOMER_QUERY_LEXICON.availability,
                options: CUSTOMER_QUERY_LEXICON.options,
                postReference: CUSTOMER_QUERY_LEXICON.postReference,
              },
              aiDraft: result.suggestedReply,
              aiAction: result.meta.ai.action,
              aiConfidence: result.meta.ai.confidence,
              privatePriceSent,
              priceInquiry,
              hasProducts,
              postContextProductMatched,
              shopUrl,
              categoryUrl,
              products: products.map((product) => ({
                name: product.name,
                nameAr: product.nameAr,
                nameEn: product.nameEn,
                category: product.category,
                productUrl: product.productUrl,
                isAvailable: product.isAvailable,
                stockStatus: product.stockStatus,
                variantSummary: product.variantSummary,
              })),
              outputRules: [
                "Return valid JSON only.",
                "Do not include any price or currency in the public reply.",
                "If hasProducts is true and the products fit the comment or post context, include at least one productUrl from products.",
                "If postContextProductMatched is true, treat products[0] as the product in the post and list it first before any related products.",
                "If priceInquiry is true and hasProducts is true, list relevant product names and productUrl values first, then add a short formal private-price note.",
                "Do not answer a product or price question with only a generic instruction to message the page when products are supplied.",
                "Include categoryUrl and shopUrl for product answers when supplied.",
                "For clarification, ask one short question.",
                "Do not mention automation, AI, scoring, tokens, webhooks, or internal rules.",
              ],
            }),
          },
        ],
        max_output_tokens: 560,
        store: false,
        temperature: 0.2,
        text: {
          format: {
            type: "json_schema",
            name: "meta_public_comment_reply",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["reply"],
              properties: {
                reply: {
                  type: "string",
                },
              },
            },
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI public comment request failed with status ${response.status}`);
    }

    const parsed = JSON.parse(extractOpenAIText(await response.json())) as {
      reply?: unknown;
    };

    return typeof parsed.reply === "string" ? parsed.reply.trim().slice(0, 1500) : "";
  } catch (error) {
    console.error("META COMMENT PUBLIC REPLY AI ERROR:", formatErrorForLog(error));
    return "";
  }
}

async function processEvent(event: MetaMessagingEvent, request: Request) {
  const normalized = normalizeEvent(event);

  if (!normalized.shouldProcess) {
    return { processed: false, reason: normalized.reason };
  }

  if (!isMessengerAutoReplyEnabled()) {
    return { processed: false, reason: "messenger_auto_reply_disabled" };
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

  if (!result.meta.ai.used) {
    console.warn("META MESSENGER AI-ONLY SKIPPED SEND:", {
      senderId: normalized.senderId,
      messageId: normalized.messageId,
      aiReason: result.meta.ai.reason,
      productsCount: result.products.length,
      bestScore: result.meta.bestScore,
    });

    return {
      processed: false,
      reason: "ai_required_no_reply_sent",
      productsCount: result.products.length,
      aiUsed: false,
      aiReason: result.meta.ai.reason,
    };
  }

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
  let postContextUsed = false;
  let postContextSearchText = "";
  const initialPostContext = await fetchFacebookPostContext(normalized.postId);

  if (initialPostContext?.searchText) {
    postContextUsed = true;
    postContextSearchText = initialPostContext.searchText;
    normalized.permalinkUrl = normalized.permalinkUrl || initialPostContext.permalinkUrl;

    console.info("META COMMENT POST CONTEXT USED:", {
      commentId: normalized.commentId,
      postId: normalized.postId,
      contextLength: initialPostContext.searchText.length,
      source: "intent_gate",
    });
  }

  const commentIntent = await classifyMetaCommentIntent({
    commentText: normalized.messageText,
    postContext: postContextSearchText,
  });

  if (commentIntent) {
    console.info("META COMMENT INTENT DECISION:", {
      commentId: normalized.commentId,
      postId: normalized.postId,
      action: commentIntent.action,
      confidence: commentIntent.confidence,
      reason: commentIntent.reason,
    });

    if (commentIntent.action === "social_reply") {
      if (!isCommentAutoReplyEnabled()) {
        await recordCommentHandoff({
          reason: "comment_auto_reply_disabled",
          commentId: normalized.commentId,
          postId: normalized.postId,
          messageText: normalized.messageText,
          permalinkUrl: normalized.permalinkUrl,
        });

        return {
          processed: false,
          reason: "comment_auto_reply_disabled",
          postContextUsed,
          aiUsed: true,
          aiAction: "answer",
          aiReason: commentIntent.reason,
        };
      }

      if (commentIntent.confidence === "low") {
        await recordCommentHandoff({
          reason: "social_reply_low_confidence",
          commentId: normalized.commentId,
          postId: normalized.postId,
          messageText: normalized.messageText,
          permalinkUrl: normalized.permalinkUrl,
        });

        return {
          processed: false,
          reason: "social_reply_low_confidence",
          postContextUsed,
          aiUsed: true,
          aiAction: "handoff",
          aiReason: commentIntent.reason,
        };
      }

      const socialReplySafety = validateMetaPublicReply(commentIntent.reply);

      if (!socialReplySafety.safe) {
        const reason = `social_reply_${socialReplySafety.reason}`;

        await recordCommentHandoff({
          reason,
          commentId: normalized.commentId,
          postId: normalized.postId,
          messageText: normalized.messageText,
          permalinkUrl: normalized.permalinkUrl,
        });

        return {
          processed: false,
          reason,
          postContextUsed,
          aiUsed: true,
          aiAction: "handoff",
          aiReason: commentIntent.reason,
        };
      }

      await sendFacebookCommentReply(normalized.commentId, commentIntent.reply);

      return {
        processed: true,
        reason: "comment_social_reply_sent",
        productsCount: 0,
        bestScore: 0,
        postContextUsed,
        aiUsed: true,
        aiAction: "answer",
        aiReason: commentIntent.reason,
      };
    }

    if (commentIntent.action === "ignore") {
      return {
        processed: false,
        reason: "comment_intent_ignored",
        postContextUsed,
        aiUsed: true,
        aiAction: "handoff",
        aiReason: commentIntent.reason,
      };
    }

    if (commentIntent.action === "handoff") {
      await recordCommentHandoff({
        reason: commentIntent.reason || "comment_intent_handoff",
        commentId: normalized.commentId,
        postId: normalized.postId,
        messageText: normalized.messageText,
        permalinkUrl: normalized.permalinkUrl,
      });

      return {
        processed: false,
        reason: commentIntent.reason || "comment_intent_handoff",
        postContextUsed,
        aiUsed: true,
        aiAction: "handoff",
        aiReason: commentIntent.reason,
      };
    }
  } else if (isLikelySocialComment(normalized.messageText, postContextSearchText)) {
    await recordCommentHandoff({
      reason: "social_comment_ai_unavailable",
      commentId: normalized.commentId,
      postId: normalized.postId,
      messageText: normalized.messageText,
      permalinkUrl: normalized.permalinkUrl,
    });

    return {
      processed: false,
      reason: "social_comment_ai_unavailable",
      postContextUsed,
      aiUsed: false,
      aiReason: "comment_intent_ai_unavailable",
    };
  }

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
    !postContextUsed &&
    (result.meta.handoffReason === "post_context_required" ||
      shouldFetchPostContextForComment(normalized.messageText))
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
    postContextLength: postContextSearchText.length,
    priceInquiry: isMetaPriceQuestion(normalized.messageText),
    aiUsed: result.meta.ai.used,
    aiAction: result.meta.ai.action,
    aiReason: result.meta.ai.reason,
  });

  if (!result.meta.ai.used) {
    await recordCommentHandoff({
      reason: result.meta.ai.reason || "ai_required_no_reply_sent",
      commentId: normalized.commentId,
      postId: normalized.postId,
      messageText: normalized.messageText,
      permalinkUrl: normalized.permalinkUrl,
      productsCount: result.products.length,
      bestScore: result.meta.bestScore,
    });

    return {
      processed: false,
      reason: result.meta.ai.reason || "ai_required_no_reply_sent",
      productsCount: result.products.length,
      bestScore: result.meta.bestScore,
      postContextUsed,
      aiUsed: false,
      aiReason: result.meta.ai.reason,
    };
  }

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

  const shouldHandoff = result.meta.autoReply === "handoff";

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

    return {
      processed: false,
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
    ? await buildFacebookPrivatePriceReply(result)
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

  const publicReply = await buildFacebookCommentReply(
    result,
    normalized.messageText,
    postContextSearchText,
    baseUrl,
    privatePriceSent
  );

  const publicReplyCategory =
    result.products[0]?.category || result.meta.matchedCategory || "";
  const publicReplyAllowedUrls = [
    ...result.products.slice(0, 3).map((product) => product.productUrl),
    buildShopUrl(baseUrl),
    publicReplyCategory ? buildCategoryUrl(publicReplyCategory, baseUrl) : "",
  ].filter(Boolean);
  const publicReplySafety = validateMetaPublicReply(
    publicReply,
    publicReplyAllowedUrls
  );

  if (!publicReplySafety.safe) {
    const reason =
      publicReplySafety.reason === "empty_reply"
        ? "ai_empty_public_reply"
        : `ai_public_reply_${publicReplySafety.reason}`;

    await recordCommentHandoff({
      reason,
      commentId: normalized.commentId,
      postId: normalized.postId,
      messageText: normalized.messageText,
      permalinkUrl: normalized.permalinkUrl,
      productsCount: result.products.length,
      bestScore: result.meta.bestScore,
    });

    return {
      processed: false,
      reason,
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

  await sendFacebookCommentReply(normalized.commentId, publicReply);

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

  const verifyToken = getVerifyToken();

  if (verifyToken && mode === "subscribe" && token === verifyToken) {
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
        console.info(
          "META WEBHOOK FEED CHANGE SHAPE:",
          summarizeMetaFeedChange(change)
        );
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
