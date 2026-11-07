import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

process.env.META_PUBLISHER_APP_ID = "APP_ID";
process.env.META_PUBLISHER_APP_SECRET = "APP_SECRET";
process.env.META_PUBLISHER_PAGE_ID = "PAGE_ID";
process.env.META_PUBLISHER_PAGE_ACCESS_TOKEN = "SYSTEM_USER_TOKEN";
process.env.META_PUBLISHER_GRAPH_API_VERSION = "v27.0";

const originalFetch = globalThis.fetch;
const requests: Array<{ url: string; body: URLSearchParams | null }> = [];

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input);
  const body =
    init?.body instanceof URLSearchParams
      ? init.body
      : typeof init?.body === "string"
        ? new URLSearchParams(init.body)
        : null;
  requests.push({ url, body });

  if (url.includes("/me/accounts")) {
    assert.match(url, /access_token=SYSTEM_USER_TOKEN/);
    return new Response(
      JSON.stringify({
        data: [
          {
            id: "PAGE_ID",
            name: "Cesar Store",
            access_token: "PAGE_ACCESS_TOKEN",
            tasks: ["ANALYZE", "CREATE_CONTENT"],
          },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  if (url.endsWith("/v27.0/PAGE_ID/photos")) {
    assert.equal(body?.get("access_token"), "PAGE_ACCESS_TOKEN");
    assert.equal(
      body?.get("appsecret_proof"),
      createHmac("sha256", "APP_SECRET")
        .update("PAGE_ACCESS_TOKEN")
        .digest("hex")
    );
    return new Response(JSON.stringify({ id: "PHOTO_ID", post_id: "POST_ID" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  throw new Error(`Unexpected test request: ${url}`);
}) as typeof fetch;

async function main() {
  const { publishToMeta } = await import(
    "../lib/server/social-publisher/meta"
  );
  const result = await publishToMeta({
    platform: "facebook",
    imageUrl: "https://www.cesareshop.com/product.jpg",
    caption: "Test caption",
  });

  assert.deepEqual(result, {
    externalPostId: "POST_ID",
    externalPostUrl: "https://www.facebook.com/POST_ID",
  });
  assert.equal(requests.length, 2);
  console.log("Facebook Page access token verification passed.");
}

main().finally(() => {
  globalThis.fetch = originalFetch;
});
