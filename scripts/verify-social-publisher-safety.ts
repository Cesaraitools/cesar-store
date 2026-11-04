import assert from "node:assert/strict";
import {
  isMetaPublishOutcomeUnknownError,
  publishToMeta,
  testMetaPublisherConnection,
} from "../lib/server/social-publisher/meta";

const originalFetch = global.fetch;

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function verifyFacebookTransportAmbiguity() {
  global.fetch = async () => {
    throw new Error("simulated timeout");
  };

  await assert.rejects(
    () =>
      publishToMeta({
        platform: "facebook",
        imageUrl: "https://example.com/product.jpg",
        caption: "test",
      }),
    (error: unknown) => isMetaPublishOutcomeUnknownError(error)
  );
}

async function verifyExplicitMetaFailureCanRetry() {
  global.fetch = async () =>
    jsonResponse({ error: { message: "Rejected", code: 190 } }, 400);

  await assert.rejects(
    () =>
      publishToMeta({
        platform: "facebook",
        imageUrl: "https://example.com/product.jpg",
        caption: "test",
      }),
    (error: unknown) => !isMetaPublishOutcomeUnknownError(error)
  );
}

async function verifyMissingFacebookIdRequiresReview() {
  global.fetch = async () => jsonResponse({});

  await assert.rejects(
    () =>
      publishToMeta({
        platform: "facebook",
        imageUrl: "https://example.com/product.jpg",
        caption: "test",
      }),
    (error: unknown) => isMetaPublishOutcomeUnknownError(error)
  );
}

async function verifyInstagramPermalinkFailureDoesNotRetry() {
  global.fetch = async (input, init) => {
    const url = String(input);
    const method = init?.method || "GET";

    if (method === "POST" && url.endsWith("/ig-test/media")) {
      return jsonResponse({ id: "container-1" });
    }
    if (url.includes("/container-1?fields=status_code")) {
      return jsonResponse({ status_code: "FINISHED" });
    }
    if (method === "POST" && url.endsWith("/ig-test/media_publish")) {
      return jsonResponse({ id: "media-1" });
    }
    if (url.includes("/media-1?fields=permalink")) {
      throw new Error("simulated permalink timeout");
    }

    throw new Error(`Unexpected Meta test request: ${method} ${url}`);
  };

  const originalConsoleError = console.error;
  console.error = () => undefined;
  let result: Awaited<ReturnType<typeof publishToMeta>>;
  try {
    result = await publishToMeta({
      platform: "instagram",
      imageUrl: "https://example.com/product.jpg",
      caption: "test",
    });
  } finally {
    console.error = originalConsoleError;
  }

  assert.deepEqual(result, {
    externalPostId: "media-1",
    externalPostUrl: "https://www.instagram.com/",
  });
}

async function verifyInstagramUnifiedLoginConnection() {
  process.env.META_PUBLISHER_INSTAGRAM_UNIFIED_ACCESS_TOKEN =
    "ig-unified-token-test";
  delete process.env.META_PUBLISHER_INSTAGRAM_ACCESS_TOKEN;

  const requestedUrls: string[] = [];
  global.fetch = async (input) => {
    const url = String(input);
    requestedUrls.push(url);

    if (url.includes("/debug_token")) {
      const parsed = new URL(url);
      assert.equal(
        parsed.searchParams.get("input_token"),
        "ig-unified-token-test"
      );
      return jsonResponse({
        data: {
          app_id: "app-test",
          is_valid: true,
          scopes: ["instagram_basic", "instagram_content_publish"],
        },
      });
    }
    if (url.startsWith("https://graph.facebook.com/v26.0/ig-test?")) {
      return jsonResponse({ id: "ig-test", username: "cesar-store-test" });
    }

    throw new Error(`Unexpected Unified Login request: ${url}`);
  };

  const result = await testMetaPublisherConnection(["instagram"]);
  assert.equal(result.instagramAuthMode, "unified_login");
  assert.deepEqual(result.instagram, {
    id: "ig-test",
    username: "cesar-store-test",
  });
  assert.ok(
    requestedUrls.every((url) => url.startsWith("https://graph.facebook.com/"))
  );

  delete process.env.META_PUBLISHER_INSTAGRAM_UNIFIED_ACCESS_TOKEN;
  process.env.META_PUBLISHER_INSTAGRAM_ACCESS_TOKEN = "ig-token-test";
}

async function main() {
  process.env.META_PUBLISHER_APP_ID = "app-test";
  process.env.META_PUBLISHER_APP_SECRET = "secret-test";
  process.env.META_PUBLISHER_PAGE_ID = "page-test";
  process.env.META_PUBLISHER_PAGE_ACCESS_TOKEN = "page-token-test";
  process.env.META_PUBLISHER_IG_USER_ID = "ig-test";
  process.env.META_PUBLISHER_INSTAGRAM_ACCESS_TOKEN = "ig-token-test";
  process.env.META_PUBLISHER_GRAPH_API_VERSION = "v26.0";

  try {
    await verifyFacebookTransportAmbiguity();
    await verifyExplicitMetaFailureCanRetry();
    await verifyMissingFacebookIdRequiresReview();
    await verifyInstagramPermalinkFailureDoesNotRetry();
    await verifyInstagramUnifiedLoginConnection();
    console.log("SOCIAL_PUBLISHER_SAFETY_OK");
  } finally {
    global.fetch = originalFetch;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
