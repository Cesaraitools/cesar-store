import type { MetaPublisherReadiness, SocialPlatform } from "./types";

const REQUIRED_ENV_BY_PLATFORM: Record<SocialPlatform, string[]> = {
  facebook: [
    "META_PUBLISHER_APP_ID",
    "META_PUBLISHER_APP_SECRET",
    "META_PUBLISHER_PAGE_ID",
    "META_PUBLISHER_PAGE_ACCESS_TOKEN",
  ],
  instagram: [
    "META_PUBLISHER_APP_ID",
    "META_PUBLISHER_APP_SECRET",
    "META_PUBLISHER_IG_USER_ID",
    "META_PUBLISHER_PAGE_ACCESS_TOKEN",
  ],
};

export function getSiteOrigin() {
  return String(
    process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.SITE_URL ||
      "https://www.cesareshop.com"
  ).replace(/\/$/, "");
}
export function getMetaGraphApiVersion() {
  const value = String(
    process.env.META_PUBLISHER_GRAPH_API_VERSION || "v26.0"
  ).trim();

  return /^v\d+\.\d+$/.test(value) ? value : "v26.0";
}

export function getMetaPublisherReadiness(
  platforms: SocialPlatform[] = ["facebook", "instagram"]
): MetaPublisherReadiness {
  const required = Array.from(
    new Set(platforms.flatMap((platform) => REQUIRED_ENV_BY_PLATFORM[platform]))
  );
  const missing = required.filter((name) => !String(process.env[name] || "").trim());

  return {
    configured: missing.length === 0,
    graphApiVersion: getMetaGraphApiVersion(),
    missing,
  };
}

export function requireMetaPublisherConfig(platform: SocialPlatform) {
  const readiness = getMetaPublisherReadiness([platform]);

  if (!readiness.configured) {
    throw new Error(
      `Social publisher is not configured: ${readiness.missing.join(", ")}`
    );
  }

  return {
    graphApiVersion: readiness.graphApiVersion,
    accessToken: String(process.env.META_PUBLISHER_PAGE_ACCESS_TOKEN),
    appId: String(process.env.META_PUBLISHER_APP_ID || ""),
    appSecret: String(process.env.META_PUBLISHER_APP_SECRET || ""),
    pageId: String(process.env.META_PUBLISHER_PAGE_ID || ""),
    instagramUserId: String(process.env.META_PUBLISHER_IG_USER_ID || ""),
  };
}
