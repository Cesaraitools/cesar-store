import { SITE_URL, absoluteUrl } from "@/lib/seo";

export const dynamic = "force-static";

export function GET() {
  const body = [
    "# Cesar Store",
    "",
    "Cesar Store is an Egyptian online store for car care products, car air fresheners, accessories, tools, lighting products, and cleaning supplies.",
    "",
    "Primary language: Arabic",
    "Secondary language: English",
    "",
    "Important pages:",
    `- Homepage: ${SITE_URL}`,
    `- Shop: ${absoluteUrl("/shop")}`,
    `- Categories: ${absoluteUrl("/categories")}`,
    `- Sitemap: ${absoluteUrl("/sitemap.xml")}`,
    `- Robots: ${absoluteUrl("/robots.txt")}`,
    "",
    "Public product pages use the /product/{id} URL pattern and include Product structured data.",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
