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

function detectLanguage(text: string) {
  return /[\u0600-\u06ff]/.test(text) ? "ar" : "en";
}

function extractMessagingEvents(body: any): MetaMessagingEvent[] {
  if (body?.object !== "page" || !Array.isArray(body.entry)) return [];

  return body.entry.flatMap((entry: any) =>
    Array.isArray(entry?.messaging) ? entry.messaging : []
  );
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
    lang: detectLanguage(messageText),
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
    requestedLanguage: normalized.lang,
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

    for (const event of events) {
      try {
        await processEvent(event, request);
      } catch (error) {
        console.error("META WEBHOOK EVENT ERROR:", error);
      }
    }

    return textResponse("EVENT_RECEIVED");
  } catch (error) {
    console.error("META WEBHOOK ERROR:", error);
    return textResponse("EVENT_RECEIVED");
  }
}
