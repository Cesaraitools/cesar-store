const DEFAULT_BASE_URL = "http://localhost:3000";
const CANONICAL_ORIGIN = "https://www.cesareshop.com";
const REQUEST_TIMEOUT_MS = 45_000;

function readBaseUrl() {
  const argumentIndex = process.argv.indexOf("--base-url");
  const argumentValue = argumentIndex >= 0 ? process.argv[argumentIndex + 1] : "";
  const value = argumentValue || process.env.SEO_AIO_BASE_URL || DEFAULT_BASE_URL;

  try {
    return new URL(value).origin;
  } catch {
    throw new Error(`Invalid base URL: ${value}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fetchWithTimeout(baseUrl, path) {
  const requestedUrl = new URL(path, baseUrl);
  const response = await fetch(requestedUrl, {
    redirect: "follow",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const finalUrl = new URL(response.url);
  assert(
    finalUrl.origin === requestedUrl.origin,
    `Route ${path} redirected outside the target origin to ${finalUrl.origin}; ` +
      "the deployment may be protected by authentication"
  );

  return response;
}

function nonEmptyLines(value) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);
}

function parseTsv(value) {
  const lines = nonEmptyLines(value);
  assert(lines.length > 1, "Merchant feed has no product rows");

  const headers = lines[0].split("\t");
  const rows = lines.slice(1).map((line) => {
    const cells = line.split("\t");
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""]));
  });

  return { headers, rows };
}

function findCanonicalHref(html) {
  const linkTags = html.match(/<link\b[^>]*>/gi) || [];

  for (const tag of linkTags) {
    const rel = tag.match(/\brel=["']([^"']+)["']/i)?.[1] || "";
    if (!rel.split(/\s+/).some((value) => value.toLowerCase() === "canonical")) {
      continue;
    }

    return tag.match(/\bhref=["']([^"']+)["']/i)?.[1] || "";
  }

  return "";
}

function normalizeComparableUrl(value) {
  const url = new URL(value);
  const normalizedPath = url.pathname === "/" ? "" : url.pathname.replace(/\/$/, "");
  return `${url.origin}${normalizedPath}${url.search}`;
}

function isLoopbackUrl(value) {
  const hostname = new URL(value).hostname;
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function findProductSchema(html) {
  const scripts = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];

  for (const match of scripts) {
    try {
      const parsed = JSON.parse(match[1]);
      const nodes = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.["@graph"])
          ? parsed["@graph"]
          : [parsed];
      const productNode = nodes.find((node) =>
        ["Product", "ProductGroup"].includes(node?.["@type"])
      );

      if (productNode) return productNode;
    } catch {
      // Ignore unrelated or malformed JSON-LD blocks and continue checking the page.
    }
  }

  return null;
}

async function verify() {
  const baseUrl = readBaseUrl();
  const isLocalTarget = isLoopbackUrl(baseUrl);
  const publicPaths = [
    "/",
    "/shop",
    "/wholesale",
    "/categories",
    "/about",
    "/contact",
    "/shipping",
    "/ordering-guide",
    "/car-care",
    "/car-air-fresheners",
    "/car-cleaning-products",
    "/car-accessories",
    "/car-lighting-tools",
    "/car-tools-equipment",
    "/car-fluids-additives",
    "/return-policy",
    "/privacy-policy",
    "/terms-of-service",
    "/data-deletion",
    "/faq",
    "/search-guide",
  ];
  const privatePaths = [
    "/admin-login",
    "/auth/login",
    "/cart",
    "/checkout",
    "/confirm",
    "/orders",
    "/review",
    "/wholesale/account",
  ];
  let shopHtml = "";
  let canonicalOrigin = isLocalTarget ? "" : CANONICAL_ORIGIN;

  for (const path of publicPaths) {
    const response = await fetchWithTimeout(baseUrl, path);
    const robotsHeader = response.headers.get("x-robots-tag") || "";
    const html = await response.text();
    assert(response.ok, `Public route ${path} returned ${response.status}`);
    assert(!/noindex/i.test(robotsHeader), `Public route ${path} is marked noindex`);

    const canonicalHref = findCanonicalHref(html);
    assert(canonicalHref, `Public route ${path} has no canonical link`);
    const observedCanonicalOrigin = new URL(canonicalHref).origin;
    if (!canonicalOrigin) canonicalOrigin = observedCanonicalOrigin;
    assert(
      isLocalTarget
        ? isLoopbackUrl(observedCanonicalOrigin)
        : observedCanonicalOrigin === CANONICAL_ORIGIN,
      `Public route ${path} canonical origin is ${observedCanonicalOrigin}`
    );
    const expectedCanonical = new URL(path, canonicalOrigin).toString();
    assert(
      normalizeComparableUrl(canonicalHref) === normalizeComparableUrl(expectedCanonical),
      `Public route ${path} canonical is ${canonicalHref}, expected ${expectedCanonical}`
    );

    if (path === "/shop") {
      shopHtml = html;
    }
  }

  const optimizedShopImageCount = (
    shopHtml.match(/\/storage\/v1\/render\/image\/public\//g) || []
  ).length;
  assert(
    optimizedShopImageCount > 0,
    "Shop HTML does not use optimized product image delivery URLs"
  );

  for (const path of privatePaths) {
    const response = await fetchWithTimeout(baseUrl, path);
    const robotsHeader = response.headers.get("x-robots-tag") || "";
    assert(response.ok, `Private route ${path} returned ${response.status}`);
    assert(/noindex/i.test(robotsHeader), `Private route ${path} is missing noindex`);
    assert(/nofollow/i.test(robotsHeader), `Private route ${path} is missing nofollow`);
  }

  const sitemapResponse = await fetchWithTimeout(baseUrl, "/sitemap.xml");
  const sitemap = await sitemapResponse.text();
  const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (match) => match[1]
  );
  const normalizedSitemapUrls = new Set(
    sitemapUrls.map((url) => normalizeComparableUrl(url))
  );
  const sitemapUrlCount = sitemapUrls.length;
  const sitemapLastmodCount = (sitemap.match(/<lastmod>/g) || []).length;
  assert(sitemapResponse.ok, `Sitemap returned ${sitemapResponse.status}`);
  assert(sitemapUrlCount >= 20, `Sitemap contains only ${sitemapUrlCount} URLs`);
  assert(
    sitemapLastmodCount <= sitemapUrlCount,
    "Sitemap contains more lastmod entries than URLs"
  );
  for (const path of publicPaths) {
    const expectedUrl = new URL(path, canonicalOrigin).toString();
    assert(
      normalizedSitemapUrls.has(normalizeComparableUrl(expectedUrl)),
      `Sitemap is missing public route ${path}`
    );
  }

  const robotsResponse = await fetchWithTimeout(baseUrl, "/robots.txt");
  const robots = await robotsResponse.text();
  assert(robotsResponse.ok, `Robots returned ${robotsResponse.status}`);
  assert(
    robots.includes(`Sitemap: ${canonicalOrigin}/sitemap.xml`),
    "Robots file is missing the canonical sitemap URL"
  );
  for (const path of ["/admin", "/api", "/auth", "/cart", "/checkout", "/confirm", "/orders", "/review"]) {
    assert(robots.includes(`Disallow: ${path}`), `Robots file does not disallow ${path}`);
  }

  const llmsResponse = await fetchWithTimeout(baseUrl, "/llms.txt");
  const llms = await llmsResponse.text();
  assert(llmsResponse.ok, `llms.txt returned ${llmsResponse.status}`);
  for (const path of ["/products.json", "/sitemap.xml", "/privacy-policy", "/return-policy", "/data-deletion"]) {
    assert(
      llms.includes(new URL(path, canonicalOrigin).toString()),
      `llms.txt is missing ${path}`
    );
  }

  const catalogResponse = await fetchWithTimeout(baseUrl, "/products.json");
  const catalog = await catalogResponse.json();
  assert(catalogResponse.ok, `Product catalog returned ${catalogResponse.status}`);
  assert(catalog.schemaVersion >= 2, "Product catalog schemaVersion is older than 2");
  assert(Array.isArray(catalog.products) && catalog.products.length > 0, "Product catalog is empty");

  const feedResponse = await fetchWithTimeout(baseUrl, "/google-products.tsv");
  const feed = parseTsv(await feedResponse.text());
  const requiredFeedHeaders = [
    "id",
    "title",
    "description",
    "link",
    "image_link",
    "availability",
    "price",
    "condition",
  ];
  assert(feedResponse.ok, `Merchant feed returned ${feedResponse.status}`);
  for (const header of requiredFeedHeaders) {
    assert(feed.headers.includes(header), `Merchant feed is missing ${header}`);
  }
  assert(
    feed.rows.length >= catalog.products.length,
    `Merchant feed has ${feed.rows.length} rows for ${catalog.products.length} products`
  );

  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const invalidMpnRows = feed.rows.filter((row) => row.mpn && uuidPattern.test(row.mpn));
  assert(invalidMpnRows.length === 0, "Merchant feed uses a UUID as an MPN");

  for (const row of feed.rows) {
    assert(row.id && row.title && row.link && row.price, `Incomplete Merchant row: ${row.id || "unknown"}`);
  }

  const sampleProduct = catalog.products.find(
    (product) => product?.id && product?.canonicalUrl
  );
  assert(sampleProduct, "Product catalog has no sample product URL");
  const productPath = new URL(sampleProduct.canonicalUrl).pathname;
  const productResponse = await fetchWithTimeout(baseUrl, productPath);
  const productHtml = await productResponse.text();
  const productSchema = findProductSchema(productHtml);
  const productCanonical = findCanonicalHref(productHtml);
  assert(productResponse.ok, `Sample product returned ${productResponse.status}`);
  assert(productSchema, "Sample product has no Product or ProductGroup JSON-LD");
  assert(productCanonical, "Sample product has no canonical link");
  assert(
    normalizeComparableUrl(productCanonical) ===
      normalizeComparableUrl(new URL(productPath, canonicalOrigin).toString()),
    `Sample product canonical is ${productCanonical}`
  );

  const summary = {
    baseUrl,
    publicRoutes: publicPaths.length,
    protectedRoutes: privatePaths.length,
    sitemapUrls: sitemapUrlCount,
    sitemapLastmods: sitemapLastmodCount,
    catalogProducts: catalog.products.length,
    merchantRows: feed.rows.length,
    sampleProductType: productSchema["@type"],
    optimizedShopImages: optimizedShopImageCount,
  };

  console.log("SEO/AIO safety verification passed");
  console.log(JSON.stringify(summary, null, 2));
}

verify().catch((error) => {
  console.error(`SEO/AIO safety verification failed: ${error.message}`);
  process.exitCode = 1;
});
