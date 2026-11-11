import assert from "node:assert/strict";
import {
  buildEvenlySpacedSchedule,
  repeatIntervalMinutes,
} from "../lib/social-publisher-schedule";
import { generateSocialCaption } from "../lib/server/social-publisher/caption";
import { publishToMeta } from "../lib/server/social-publisher/meta";

const originalFetch = global.fetch;

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function verifyEvenSchedules() {
  const twice = buildEvenlySpacedSchedule("2026-11-03T18:00:00.000Z", 2);
  assert.deepEqual(twice, [
    "2026-11-03T18:00:00.000Z",
    "2026-11-04T06:00:00.000Z",
  ]);
  assert.equal(repeatIntervalMinutes(2), 720);

  const threeTimes = buildEvenlySpacedSchedule(
    "2026-11-03T18:00:00.000Z",
    3
  );
  assert.deepEqual(threeTimes, [
    "2026-11-03T18:00:00.000Z",
    "2026-11-04T02:00:00.000Z",
    "2026-11-04T10:00:00.000Z",
  ]);
  assert.equal(repeatIntervalMinutes(3), 480);
}

async function verifyAiCaptionIsolation() {
  process.env.OPENAI_API_KEY = "publisher-test-key";
  process.env.SOCIAL_PUBLISHER_OPENAI_MODEL = "publisher-test-model";
  let requestBody: Record<string, unknown> | null = null;

  global.fetch = async (_input, init) => {
    assert.equal(
      (init?.headers as Record<string, string>).Authorization,
      "Bearer publisher-test-key"
    );
    requestBody = JSON.parse(String(init?.body || "{}"));
    return jsonResponse({
      output_text: JSON.stringify({
        caption: "اختيارات عملية لسيارتك.\nالمنتج الأول، والمنتج الثاني في منشور واحد.",
        relationship: "different_products",
      }),
    });
  };

  const result = await generateSocialCaption({
    language: "ar",
    arabicTone: "egyptian",
    products: [
      {
        id: "product-1",
        name: "المنتج الأول",
        description: "الوصف الأول",
        category: "العناية بالسيارات",
        imageUrl: "https://example.com/one.jpg",
        productUrl: "https://www.cesareshop.com/product/product-1",
      },
      {
        id: "product-2",
        name: "المنتج الثاني",
        description: "الوصف الثاني",
        category: "إكسسوارات السيارات",
        imageUrl: "https://example.com/two.jpg",
        productUrl: "https://www.cesareshop.com/product/product-2",
      },
    ],
  });

  assert.equal(result.model, "publisher-test-model");
  assert.equal(result.relationship, "different_products");
  assert.ok(result.caption.includes("المنتج الأول"));
  const input = requestBody?.input as Array<{ content?: unknown }>;
  const content = input[1].content as Array<{ type?: string }>;
  assert.equal(content.filter((item) => item.type === "input_image").length, 2);
}

async function verifyFacebookAlbum() {
  let photoCount = 0;
  global.fetch = async (input, init) => {
    const url = String(input);
    const values = new URLSearchParams(String(init?.body || ""));

    if (url.includes("/me/accounts")) {
      return jsonResponse({
        data: [
          {
            id: "page-test",
            access_token: "resolved-page-token-test",
            tasks: ["CREATE_CONTENT"],
          },
        ],
      });
    }

    if (url.endsWith("/page-test/photos")) {
      photoCount += 1;
      assert.equal(values.get("published"), "false");
      return jsonResponse({ id: `facebook-photo-${photoCount}` });
    }
    if (url.endsWith("/page-test/feed")) {
      assert.deepEqual(JSON.parse(values.get("attached_media") || "[]"), [
        { media_fbid: "facebook-photo-1" },
        { media_fbid: "facebook-photo-2" },
      ]);
      return jsonResponse({ id: "facebook-post-1" });
    }

    throw new Error(`Unexpected Facebook request: ${url}`);
  };

  const result = await publishToMeta({
    platform: "facebook",
    imageUrls: ["https://example.com/one.jpg", "https://example.com/two.jpg"],
    caption: "album caption",
  });
  assert.equal(photoCount, 2);
  assert.equal(result.externalPostId, "facebook-post-1");
}

async function verifyInstagramCarousel() {
  let childCount = 0;
  global.fetch = async (input, init) => {
    const url = String(input);
    const method = init?.method || "GET";
    const values = new URLSearchParams(String(init?.body || ""));

    if (method === "POST" && url.endsWith("/ig-test/media")) {
      if (values.get("media_type") === "CAROUSEL") {
        assert.equal(values.get("children"), "instagram-child-1,instagram-child-2");
        return jsonResponse({ id: "instagram-carousel-1" });
      }
      childCount += 1;
      assert.equal(values.get("is_carousel_item"), "true");
      return jsonResponse({ id: `instagram-child-${childCount}` });
    }
    if (url.includes("fields=status_code")) {
      return jsonResponse({ status_code: "FINISHED" });
    }
    if (method === "POST" && url.endsWith("/ig-test/media_publish")) {
      assert.equal(values.get("creation_id"), "instagram-carousel-1");
      return jsonResponse({ id: "instagram-media-1" });
    }
    if (url.includes("/instagram-media-1?fields=permalink")) {
      return jsonResponse({ permalink: "https://www.instagram.com/p/test/" });
    }

    throw new Error(`Unexpected Instagram request: ${method} ${url}`);
  };

  const result = await publishToMeta({
    platform: "instagram",
    imageUrls: ["https://example.com/one.jpg", "https://example.com/two.jpg"],
    caption: "carousel caption",
  });
  assert.equal(childCount, 2);
  assert.deepEqual(result, {
    externalPostId: "instagram-media-1",
    externalPostUrl: "https://www.instagram.com/p/test/",
  });
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
    verifyEvenSchedules();
    await verifyAiCaptionIsolation();
    await verifyFacebookAlbum();
    await verifyInstagramCarousel();
    console.log("SOCIAL_PUBLISHER_CAMPAIGNS_OK");
  } finally {
    global.fetch = originalFetch;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
