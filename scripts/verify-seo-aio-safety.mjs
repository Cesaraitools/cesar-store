const DEFAULT_BASE_URL = "http://localhost:3000";
const REQUEST_TIMEOUT_MS = 20_000;

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
  const response = await fetch(new URL(path, baseUrl), {
    redirect: "follow",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

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
  const publicPaths = ["/", "/shop", "/about", "/faq"];
  const privatePaths = [
    "/admin-login",
    "/auth/login",
    "/cart",
    "/checkout",
    "/orders",
    "/review",
    "/wholesale/account",
  ];
  let shopHtml = "";

  for (const path of publicPaths) {
    const response = await fetchWithTimeout(baseUrl, path);
    const robotsHeader = response.headers.get("x-robots-tag") || "";
    assert(response.ok, `Public route ${path} returned ${response.status}`);
    assert(!/noindex/i.test(robotsHeader), `Public route ${path} is marked noindex`);

    if (path === "/shop") {
      shopHtml = await response.text();
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
  const sitemapUrlCount = (sitemap.match(/<loc>/g) || []).length;
  const sitemapLastmodCount = (sitemap.match(/<lastmod>/g) || []).length;
  assert(sitemapResponse.ok, `Sitemap returned ${sitemapResponse.status}`);
  assert(sitemapUrlCount >= 20, `Sitemap contains only ${sitemapUrlCount} URLs`);
  assert(
    sitemapLastmodCount <= sitemapUrlCount,
    "Sitemap contains more lastmod entries than URLs"
  );

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
  assert(productResponse.ok, `Sample product returned ${productResponse.status}`);
  assert(productSchema, "Sample product has no Product or ProductGroup JSON-LD");

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
