import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { createServiceRoleClient } from "@/lib/supabase/runtime";

const EXTENSION_TO_MIME: Record<string, string> = {
  apng: "image/apng",
  avif: "image/avif",
  bmp: "image/bmp",
  dib: "image/bmp",
  gif: "image/gif",
  heic: "image/heic",
  heif: "image/heif",
  ico: "image/x-icon",
  jfif: "image/jpeg",
  jpe: "image/jpeg",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  jxl: "image/jxl",
  png: "image/png",
  svg: "image/svg+xml",
  tif: "image/tiff",
  tiff: "image/tiff",
  webp: "image/webp",
};

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/apng": "apng",
  "image/avif": "avif",
  "image/bmp": "bmp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/jpeg": "jpg",
  "image/jxl": "jxl",
  "image/png": "png",
  "image/svg+xml": "svg",
  "image/tiff": "tiff",
  "image/vnd.microsoft.icon": "ico",
  "image/webp": "webp",
  "image/x-icon": "ico",
};

const MIME_TYPE_ALIASES: Record<string, string> = {
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/svg": "image/svg+xml",
  "image/x-ms-bmp": "image/bmp",
  "image/x-png": "image/png",
};

const SEARCHABLE_IMAGE_EXTENSIONS = Array.from(
  new Set(Object.keys(EXTENSION_TO_MIME))
);

const MANAGED_UPLOAD_PUBLIC_SEGMENT = "/storage/v1/object/public/upload/";

type ResolvedUploadSource = {
  buffer: Buffer;
  extension: string;
  mimeType: string;
  originalName: string | null;
  sourceLabel: string;
};

type EnsureMediaAssetBaseInput = {
  appOrigin?: string;
  uploadType: string;
};

type EnsureMediaAssetInput =
  | (EnsureMediaAssetBaseInput & {
      file: File;
      imageUrl?: never;
    })
  | (EnsureMediaAssetBaseInput & {
      imageUrl: string;
      file?: never;
    });

type EnsureMediaAssetResult = {
  hash: string;
  path: string;
  reused: boolean;
  url: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  baseDelayMs = 250
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === attempts) {
        break;
      }

      await sleep(baseDelayMs * 2 ** (attempt - 1));
    }
  }

  throw lastError;
}

function normalizeMimeType(input?: string | null): string | null {
  if (!input) return null;

  const normalized = input.toLowerCase().split(";")[0].trim();
  const mapped = MIME_TYPE_ALIASES[normalized] || normalized;

  if (MIME_TO_EXTENSION[mapped]) {
    return mapped;
  }

  return mapped.startsWith("image/") ? mapped : null;
}

function normalizeExtension(input?: string | null): string | null {
  if (!input) return null;

  const normalized = input.toLowerCase().replace(/^\./, "").trim();

  if (EXTENSION_TO_MIME[normalized]) {
    return normalized;
  }

  return /^[a-z0-9]+$/i.test(normalized) ? normalized : null;
}

function getMimeTypeFromExtension(input?: string | null): string | null {
  const extension = normalizeExtension(input);

  if (!extension) {
    return null;
  }

  return EXTENSION_TO_MIME[extension] || `image/${extension}`;
}

function getExtensionFromMimeType(input?: string | null): string | null {
  const mimeType = normalizeMimeType(input);

  if (!mimeType) {
    return null;
  }

  if (MIME_TO_EXTENSION[mimeType]) {
    return MIME_TO_EXTENSION[mimeType];
  }

  const subtype = mimeType.slice("image/".length).split("+")[0].trim().toLowerCase();
  return normalizeExtension(subtype);
}

function sanitizeUploadType(input: string): string {
  const normalized = input.replace(/\\/g, "/").trim().replace(/^\/+|\/+$/g, "");

  if (!normalized || normalized.includes("..")) {
    throw new Error("Invalid upload type");
  }

  return normalized;
}

function stripQueryAndHash(input: string): string {
  return input.split("#")[0].split("?")[0];
}

function isExternalUrl(input: string): boolean {
  return /^https?:\/\//i.test(input);
}

function toNormalizedLocalPath(input: string): string {
  const normalizedPath = stripQueryAndHash(input).replace(/\\/g, "/").trim();
  const relativePath = normalizedPath.replace(/^\/+/, "");

  if (!relativePath || relativePath.includes("..")) {
    throw new Error("Invalid local image path");
  }

  return `/${relativePath}`;
}

function buildLocalSourceCandidates(imagePath: string) {
  const normalizedPath = toNormalizedLocalPath(imagePath);
  const parsedPath = path.posix.parse(normalizedPath);
  const rawExtension = parsedPath.ext.replace(/^\./, "").trim().toLowerCase();
  const preferredExtension = normalizeExtension(rawExtension);
  const extensionsToTry = preferredExtension
    ? [
        preferredExtension,
        ...SEARCHABLE_IMAGE_EXTENSIONS.filter(
          (extension) => extension !== preferredExtension
        ),
      ]
    : SEARCHABLE_IMAGE_EXTENSIONS;
  const seen = new Set<string>();
  const candidates: string[] = [];

  if (!rawExtension) {
    for (const extension of extensionsToTry) {
      const candidate = `${normalizedPath}.${extension}`;
      if (seen.has(candidate)) continue;

      seen.add(candidate);
      candidates.push(candidate);
    }

    return candidates;
  }

  candidates.push(normalizedPath);
  seen.add(normalizedPath);

  for (const extension of extensionsToTry) {
    const candidate =
      rawExtension === extension
        ? normalizedPath
        : path.posix.join(parsedPath.dir, `${parsedPath.name}.${extension}`);

    if (seen.has(candidate)) continue;

    seen.add(candidate);
    candidates.push(candidate);
  }

  return candidates;
}

function toPublicFilePath(localPath: string) {
  const normalized = toNormalizedLocalPath(localPath).replace(/^\/+/, "");
  return path.join(process.cwd(), "public", ...normalized.split("/"));
}

function isMissingFileError(error: unknown) {
  return (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}

async function tryReadLocalFile(candidatePath: string): Promise<ResolvedUploadSource | null> {
  try {
    const fullPath = toPublicFilePath(candidatePath);
    const stat = await fs.stat(fullPath);

    if (!stat.isFile()) {
      return null;
    }

    const mimeType = getMimeTypeFromExtension(path.extname(fullPath));
    if (!mimeType) {
      throw new Error("Unsupported local image type");
    }

    const extension =
      normalizeExtension(path.extname(fullPath)) ??
      getExtensionFromMimeType(mimeType) ??
      "img";

    return {
      buffer: await fs.readFile(fullPath),
      extension,
      mimeType,
      originalName: path.basename(fullPath) || null,
      sourceLabel: fullPath,
    };
  } catch (error) {
    if (isMissingFileError(error)) {
      return null;
    }

    throw error;
  }
}

async function tryReadFirstImageFromDirectory(
  imagePath: string
): Promise<ResolvedUploadSource | null> {
  try {
    const fullPath = toPublicFilePath(imagePath);
    const stat = await fs.stat(fullPath);

    if (!stat.isDirectory()) {
      return null;
    }

    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    const firstImage = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((fileName) => Boolean(getMimeTypeFromExtension(path.extname(fileName))))
      .sort((a, b) => a.localeCompare(b, "en"))
      .at(0);

    if (!firstImage) {
      return null;
    }

    return tryReadLocalFile(path.posix.join(toNormalizedLocalPath(imagePath), firstImage));
  } catch (error) {
    if (isMissingFileError(error)) {
      return null;
    }

    throw error;
  }
}

async function resolveRemoteSource(imageUrl: string): Promise<ResolvedUploadSource> {
  const remoteUrl = new URL(imageUrl);
  const response = await withRetry(
    () => fetch(remoteUrl, { cache: "no-store" }),
    3,
    300
  );

  if (!response.ok) {
    throw new Error(`Remote image request failed (${response.status})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const mimeType =
    normalizeMimeType(response.headers.get("content-type")) ??
    getMimeTypeFromExtension(path.extname(remoteUrl.pathname));

  if (!mimeType) {
    throw new Error("Unsupported remote image type");
  }

  const extension =
    normalizeExtension(path.extname(remoteUrl.pathname)) ??
    getExtensionFromMimeType(mimeType) ??
    "img";

  return {
    buffer,
    extension,
    mimeType,
    originalName: path.basename(remoteUrl.pathname) || null,
    sourceLabel: remoteUrl.toString(),
  };
}

async function resolveLocalSourceFromOrigin(
  imagePath: string,
  appOrigin?: string
): Promise<ResolvedUploadSource> {
  const candidates = buildLocalSourceCandidates(imagePath);
  let lastError: string | null = null;

  for (const candidatePath of candidates) {
    const localFile = await tryReadLocalFile(candidatePath);
    if (localFile) {
      return localFile;
    }
  }

  const directoryImage = await tryReadFirstImageFromDirectory(imagePath);
  if (directoryImage) {
    return directoryImage;
  }

  if (!appOrigin) {
    throw new Error(`Local image not found in public directory: ${imagePath}`);
  }

  for (const candidatePath of candidates) {
    const candidateUrl = new URL(candidatePath, appOrigin);
    const response = await withRetry(
      () => fetch(candidateUrl, { cache: "no-store" }),
      3,
      300
    );

    if (!response.ok) {
      lastError = `Local image request failed (${response.status})`;
      continue;
    }

    const mimeType =
      normalizeMimeType(response.headers.get("content-type")) ??
      getMimeTypeFromExtension(path.extname(candidateUrl.pathname));

    if (!mimeType) {
      lastError = "Unsupported local image type";
      continue;
    }

    const extension =
      normalizeExtension(path.extname(candidateUrl.pathname)) ??
      getExtensionFromMimeType(mimeType) ??
      "img";

    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      extension,
      mimeType,
      originalName: path.basename(candidateUrl.pathname) || null,
      sourceLabel: candidateUrl.toString(),
    };
  }

  throw new Error(lastError || `Local image not found: ${imagePath}`);
}

async function resolveBrowserFile(file: File): Promise<ResolvedUploadSource> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType =
    normalizeMimeType(file.type) ??
    getMimeTypeFromExtension(path.extname(file.name));

  if (!mimeType) {
    throw new Error("Invalid image file type");
  }

  const extension =
    normalizeExtension(path.extname(file.name)) ??
    getExtensionFromMimeType(mimeType) ??
    "img";

  return {
    buffer,
    extension,
    mimeType,
    originalName: file.name || null,
    sourceLabel: file.name || "uploaded-file",
  };
}

async function resolveUploadSource(
  input: EnsureMediaAssetInput
): Promise<ResolvedUploadSource> {
  if ("file" in input && input.file) {
    return resolveBrowserFile(input.file);
  }

  if (!input.imageUrl) {
    throw new Error("Missing image source");
  }

  return isExternalUrl(input.imageUrl)
    ? resolveRemoteSource(input.imageUrl)
    : resolveLocalSourceFromOrigin(input.imageUrl, input.appOrigin);
}

export function getManagedStoragePath(url: string): string | null {
  if (!url.includes(MANAGED_UPLOAD_PUBLIC_SEGMENT)) {
    return null;
  }

  const [, rawPath = ""] = url.split(MANAGED_UPLOAD_PUBLIC_SEGMENT);
  const normalized = stripQueryAndHash(rawPath).trim();

  return normalized || null;
}

export async function ensureMediaAssetForSource(
  input: EnsureMediaAssetInput
): Promise<EnsureMediaAssetResult> {
  const supabase = createServiceRoleClient();
  const uploadType = sanitizeUploadType(input.uploadType);
  const source = await resolveUploadSource(input);
  const hash = crypto.createHash("md5").update(source.buffer).digest("hex");

  const { data: existingAsset, error: existingAssetError } = await supabase
    .from("media_assets")
    .select("hash, storage_path, public_url")
    .eq("hash", hash)
    .maybeSingle();

  if (existingAssetError) {
    throw existingAssetError;
  }

  if (existingAsset?.public_url && existingAsset?.storage_path) {
    return {
      hash,
      path: existingAsset.storage_path,
      reused: true,
      url: existingAsset.public_url,
    };
  }

  const storagePath = `${uploadType}/${hash}.${source.extension}`;

  const { error: uploadError } = await withRetry(
    () =>
      supabase.storage.from("upload").upload(storagePath, source.buffer, {
        contentType: source.mimeType,
        upsert: false,
      }),
    3,
    300
  );

  if (uploadError && !/already exists/i.test(uploadError.message)) {
    throw new Error(uploadError.message);
  }

  const { data: publicData } = supabase.storage.from("upload").getPublicUrl(storagePath);
  const publicUrl = publicData.publicUrl;

  const { error: insertError } = await supabase.from("media_assets").upsert(
    [
      {
        hash,
        storage_path: storagePath,
        public_url: publicUrl,
        mime_type: source.mimeType,
        byte_size: source.buffer.byteLength,
        original_name: source.originalName,
        updated_at: new Date().toISOString(),
      },
    ],
    {
      onConflict: "hash",
    }
  );

  if (insertError) {
    throw insertError;
  }

  return {
    hash,
    path: storagePath,
    reused: Boolean(existingAsset || uploadError),
    url: publicUrl,
  };
}

export async function cleanupUnusedManagedImages(imageUrls: string[]) {
  const supabase = createServiceRoleClient();
  const candidatePaths = Array.from(
    new Set(imageUrls.map((url) => getManagedStoragePath(url)).filter(Boolean))
  ) as string[];

  if (!candidatePaths.length) {
    return { deletedPaths: [] as string[] };
  }

  const { data: allProducts, error: productsError } = await supabase
    .from("products")
    .select("images_json");

  if (productsError) {
    throw productsError;
  }

  const usedPaths = new Set<string>();

  for (const product of allProducts || []) {
    if (!Array.isArray(product.images_json)) continue;

    for (const image of product.images_json) {
      if (typeof image !== "string") continue;

      const managedPath = getManagedStoragePath(image);
      if (managedPath) {
        usedPaths.add(managedPath);
      }
    }
  }

  const pathsToDelete = candidatePaths.filter((candidate) => !usedPaths.has(candidate));

  if (!pathsToDelete.length) {
    return { deletedPaths: [] as string[] };
  }

  const { error: removeError } = await supabase.storage
    .from("upload")
    .remove(pathsToDelete);

  if (removeError) {
    throw removeError;
  }

  const { error: deleteAssetError } = await supabase
    .from("media_assets")
    .delete()
    .in("storage_path", pathsToDelete);

  if (deleteAssetError) {
    throw deleteAssetError;
  }

  return { deletedPaths: pathsToDelete };
}
