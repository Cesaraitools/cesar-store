import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const privatePaths = [
    "/admin",
    "/admin-login",
    "/api",
    "/auth",
    "/cart",
    "/checkout",
    "/orders",
    "/wholesale/account",
    "/wholesale/apply",
    "/wholesale/cart",
    "/wholesale/catalog",
    "/wholesale/order",
    "/wholesale/orders",
    "/wholesale/product",
    "/wholesale/status",
    "/sentry-example-page",
  ];
  const crawlerRules = [
    "*",
    "Googlebot",
    "Bingbot",
    "OAI-SearchBot",
    "ChatGPT-User",
    "GPTBot",
    "OAI-AdsBot",
    "PerplexityBot",
    "Perplexity-User",
    "ClaudeBot",
    "Claude-SearchBot",
    "Claude-User",
    "Applebot",
    "Applebot-Extended",
    "Google-Extended",
  ].map((userAgent) => ({
    userAgent,
    allow: "/",
    disallow: privatePaths,
  }));

  return {
    rules: crawlerRules,
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
