import { createWriteStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";

const DEFAULT_SOURCE = "https://www.cesareshop.com/products.json";
const DEFAULT_OUTPUT_DIR = path.join("exports", "product-images");
const DEFAULT_CONCURRENCY = 6;

function parseArgs(argv) {
  const options = {
    source: DEFAULT_SOURCE,
    outDir: DEFAULT_OUTPUT_DIR,
    concurrency: DEFAULT_CONCURRENCY,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === "--source" && next) {
      options.source = next;
      index += 1;
    } else if (arg === "--out" && next) {
      options.outDir = next;
      index += 1;
    } else if (arg === "--concurrency" && next) {
      const parsed = Number.parseInt(next, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        options.concurrency = parsed;
      }
      index += 1;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return options;
}

function printHelp() {
  console.log(`
Download Cesar Store product images.

Usage:
  node scripts/download-product-images.mjs
  node scripts/download-product-images.mjs --out exports/product-images
  node scripts/download-product-images.mjs --source https://www.cesareshop.com/products.json

Options:
  --source <url>       Product JSON URL. Defaults to ${DEFAULT_SOURCE}
  --out <directory>   Output directory. Defaults to ${DEFAULT_OUTPUT_DIR}
  --concurrency <n>   Parallel downloads. Defaults to ${DEFAULT_CONCURRENCY}
`);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeProducts(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.products)) return payload.products;
  throw new Error("Source JSON must be an array or an object with a products array.");
}

function normalizeUrl(rawUrl, sourceUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return null;

  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.includes("placeholder.png")) return null;

  try {
    const url = new URL(trimmed, sourceUrl);
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

function imageExtension(urlString, contentType) {
  const fromContentType = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/avif": ".avif",
  }[String(contentType || "").split(";")[0].trim().toLowerCase()];

  if (fromContentType) return fromContentType;

  try {
    const ext = path.extname(decodeURIComponent(new URL(urlString).pathname)).toLowerCase();
    if ([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"].includes(ext)) {
      return ext === ".jpeg" ? ".jpg" : ext;
    }
  } catch {
    return ".jpg";
  }

  return ".jpg";
}

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function productName(product) {
  return product?.name?.ar || product?.name?.en || product?.title || "";
}

function collectProductImages(products, sourceUrl) {
  const byUrl = new Map();

  for (const product of products) {
    const imageCandidates = [
      product.imageUrl,
      product.image,
      ...asArray(product.images),
      ...asArray(product.variants).map((variant) => variant?.image),
    ];

    imageCandidates.forEach((candidate, imageIndex) => {
      const url = normalizeUrl(candidate, sourceUrl);
      if (!url) return;

      if (!byUrl.has(url)) {
        byUrl.set(url, {
          url,
          productId: product.id || product.sku || "",
          productName: productName(product),
          category: product.category || product?.categoryDetails?.id || "",
          productUrl: product.productUrl || product.canonicalUrl || "",
          imageIndex,
        });
      }
    });
  }

  return [...byUrl.values()];
}

async function fetchJson(source) {
  const response = await fetch(source, {
    headers: {
      Accept: "application/json",
      "User-Agent": "cesar-store-product-image-export/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${source}: HTTP ${response.status}`);
  }

  return response.json();
}

async function downloadImage(item, index, imagesDir) {
  const response = await fetch(item.url, {
    headers: {
      Accept: "image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8",
      "User-Agent": "cesar-store-product-image-export/1.0",
    },
  });

  if (!response.ok || !response.body) {
    throw new Error(`HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  const ext = imageExtension(item.url, contentType);
  const baseName = `${String(index + 1).padStart(4, "0")}-${item.productId || "product"}-${item.imageIndex}${ext}`;
  const fileName = baseName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = path.join(imagesDir, fileName);

  await pipeline(response.body, createWriteStream(filePath));

  return {
    ...item,
    fileName,
    filePath,
    contentType,
    bytes: Number(response.headers.get("content-length") || 0) || null,
  };
}

async function runQueue(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;

  async function next() {
    while (cursor < items.length) {
      const current = cursor;
      cursor += 1;

      try {
        results[current] = { ok: true, value: await worker(items[current], current) };
        process.stdout.write(".");
      } catch (error) {
        results[current] = {
          ok: false,
          item: items[current],
          error: error instanceof Error ? error.message : String(error),
        };
        process.stdout.write("x");
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => next())
  );
  process.stdout.write("\n");

  return results;
}

async function writeManifest(outDir, rows) {
  const csvRows = [
    [
      "file_name",
      "source_url",
      "product_id",
      "product_name",
      "category",
      "product_url",
      "content_type",
      "bytes",
    ],
    ...rows.map((row) => [
      row.fileName,
      row.url,
      row.productId,
      row.productName,
      row.category,
      row.productUrl,
      row.contentType,
      row.bytes ?? "",
    ]),
  ];

  await fs.writeFile(
    path.join(outDir, "images-manifest.csv"),
    `${csvRows.map((row) => row.map(csvCell).join(",")).join("\n")}\n`,
    "utf8"
  );

  await fs.writeFile(
    path.join(outDir, "images-manifest.json"),
    `${JSON.stringify(rows, null, 2)}\n`,
    "utf8"
  );
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const outDir = path.resolve(options.outDir);
  const imagesDir = path.join(outDir, "images");

  await fs.mkdir(imagesDir, { recursive: true });

  console.log(`Source: ${options.source}`);
  console.log(`Output: ${outDir}`);

  const payload = await fetchJson(options.source);
  const products = normalizeProducts(payload);
  const images = collectProductImages(products, options.source);

  console.log(`Products: ${products.length}`);
  console.log(`Unique product images: ${images.length}`);

  const results = await runQueue(images, options.concurrency, (item, index) =>
    downloadImage(item, index, imagesDir)
  );

  const downloaded = results
    .filter((result) => result.ok)
    .map((result) => result.value);
  const failed = results.filter((result) => !result.ok);

  await writeManifest(outDir, downloaded);

  if (failed.length) {
    await fs.writeFile(
      path.join(outDir, "failed-images.json"),
      `${JSON.stringify(failed, null, 2)}\n`,
      "utf8"
    );
  }

  console.log(`Downloaded: ${downloaded.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Manifest: ${path.join(outDir, "images-manifest.csv")}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
