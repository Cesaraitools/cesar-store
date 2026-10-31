import type { MetaPublisherReadiness, SocialPlatform } from "./types";

const COMMON_REQUIRED_ENV = [
  "META_PUBLISHER_APP_ID",
  "META_PUBLISHER_APP_SECRET",
];

function envValue(name: string) {
  return String(process.env[name] || "").trim();
}

export function getInstagramAuthMode():
  | "instagram_login"
  | "facebook_login"
  | null {
  if (envValue("META_PUBLISHER_INSTAGRAM_ACCESS_TOKEN")) {
    return "instagram_login";
  }
  if (envValue("META_PUBLISHER_PAGE_ACCESS_TOKEN")) {
    return "facebook_login";
  }
  return null;
}

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
  const required = new Set(COMMON_REQUIRED_ENV);

  if (platforms.includes("facebook")) {
    required.add("META_PUBLISHER_PAGE_ID");
    required.add("META_PUBLISHER_PAGE_ACCESS_TOKEN");
  }
  if (platforms.includes("instagram")) {
    required.add("META_PUBLISHER_IG_USER_ID");
  }

  const missing = [...required].filter((name) => !envValue(name));
  const instagramAuthMode = platforms.includes("instagram")
    ? getInstagramAuthMode()
    : null;
  if (platforms.includes("instagram") && !instagramAuthMode) {
    missing.push(
      "META_PUBLISHER_INSTAGRAM_ACCESS_TOKEN or META_PUBLISHER_PAGE_ACCESS_TOKEN"
    );
  }

  return {
    configured: missing.length === 0,
    graphApiVersion: getMetaGraphApiVersion(),
    instagramAuthMode,
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
    accessToken:
      platform === "instagram" &&
      readiness.instagramAuthMode === "instagram_login"
        ? envValue("META_PUBLISHER_INSTAGRAM_ACCESS_TOKEN")
        : envValue("META_PUBLISHER_PAGE_ACCESS_TOKEN"),
    apiOrigin:
      platform === "instagram" &&
      readiness.instagramAuthMode === "instagram_login"
        ? "https://graph.instagram.com"
        : "https://graph.facebook.com",
    appId: envValue("META_PUBLISHER_APP_ID"),
    appSecret: envValue("META_PUBLISHER_APP_SECRET"),
    pageId: envValue("META_PUBLISHER_PAGE_ID"),
    instagramUserId: envValue("META_PUBLISHER_IG_USER_ID"),
    instagramAuthMode: readiness.instagramAuthMode,
  };
}
