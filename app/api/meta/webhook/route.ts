import crypto from "crypto";
import { getRedis } from "@/lib/infra/redis";
import { searchAutomationProducts } from "@/lib/server/automation-products";

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
    throw new Error(
      `Meta comment reply failed ${response.status}: ${responseText.slice(0, 500)}`
    );
  }

  return { ok: true, status: response.status };
}

async function recordCommentHandoff(input: {
  reason: string;
  commentId: string;
  postId: string;
  messageText: string;
  permalinkUrl: string;
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

  const result = await searchAutomationProducts({
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

  const result = await searchAutomationProducts({
    query: normalized.messageText,
    requestedLanguage: "ar",
    limit: 3,
    baseUrl: getBaseUrl(request),
  });

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
      productsCount: result.products.length,
      bestScore: result.meta.bestScore,
    };
  }

  if (!result.products.length || result.meta.bestScore < getCommentMinimumScore()) {
    await recordCommentHandoff({
      reason: "low_confidence_product_match",
      commentId: normalized.commentId,
      postId: normalized.postId,
      messageText: normalized.messageText,
      permalinkUrl: normalized.permalinkUrl,
    });

    return {
      processed: false,
      reason: "low_confidence_product_match",
      productsCount: result.products.length,
      bestScore: result.meta.bestScore,
    };
  }

  await sendFacebookCommentReply(
    normalized.commentId,
    `${result.suggestedReply}\n\nلو تحب تفاصيل أكتر ابعتلنا رسالة.`
  );

  return {
    processed: true,
    reason: "comment_reply_sent",
    productsCount: result.products.length,
    bestScore: result.meta.bestScore,
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
