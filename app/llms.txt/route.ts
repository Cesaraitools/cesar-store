import { SITE_URL, absoluteUrl } from "@/lib/seo";

export const dynamic = "force-static";

export function GET() {
  const body = [
    "# Cesar Store",
    "",
    "Cesar Store is an Egyptian online store for car care products, car air fresheners, accessories, tools, lighting products, cleaning supplies, and selected vehicle accessories.",
    "",
    "Primary language: Arabic",
    "Secondary language: English",
    "Market: Egypt",
    "Currency: EGP",
    "Canonical host: https://www.cesareshop.com",
    "",
    "Public pages:",
    `- Homepage: ${SITE_URL}`,
    `- Shop: ${absoluteUrl("/shop")}`,
    `- Categories: ${absoluteUrl("/categories")}`,
    `- About: ${absoluteUrl("/about")}`,
    `- Return policy: ${absoluteUrl("/return-policy")}`,
    `- FAQ: ${absoluteUrl("/faq")}`,
    "",
    "Machine-readable resources:",
    `- Sitemap: ${absoluteUrl("/sitemap.xml")}`,
    `- Robots: ${absoluteUrl("/robots.txt")}`,
    `- Product catalog JSON: ${absoluteUrl("/products.json")}`,
    `- Merchant product feed TSV: ${absoluteUrl("/google-products.tsv")}`,
    "",
    "Product pages:",
    "- Public product pages use the /product/{id} URL pattern.",
    "- Product pages include Product structured data, canonical URLs, price, availability, images, and breadcrumb data.",
    "- The current product list should be discovered from the sitemap or products.json rather than guessed.",
    "",
    "Crawl guidance:",
    "- Public catalog pages may be crawled and cited.",
    "- Admin, account, cart, checkout, orders, auth, and API paths are private or transactional and should not be used for answer generation.",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
