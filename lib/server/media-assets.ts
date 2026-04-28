import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { createServiceRoleClient } from "@/lib/supabase/runtime";

const ALLOWED_MIME_TYPES = new Set([
  "image/avif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const EXTENSION_TO_MIME: Record<string, string> = {
  avif: "image/avif",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/avif": "avif",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MANAGED_UPLOAD_PUBLIC_SEGMENT = "/storage/v1/object/public/upload/";

type ResolvedUploadSource = {
  buffer: Buffer;
  extension: string;
  mimeType: string;
  originalName: string | null;
  sourceLabel: string;
};

type EnsureMediaAssetInput =
  | {
      uploadType: string;
      file: File;
      imageUrl?: never;
    }
  | {
      uploadType: string;
      imageUrl: string;
      file?: never;
    };

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
  const mapped = normalized === "image/jpg" ? "image/jpeg" : normalized;

  return ALLOWED_MIME_TYPES.has(mapped) ? mapped : null;
}

function normalizeExtension(input?: string | null): string | null {
  if (!input) return null;

  const normalized = input.toLowerCase().replace(/^\./, "").trim();
  return EXTENSION_TO_MIME[normalized] ? normalized : null;
}

function getMimeTypeFromExtension(input?: string | null): string | null {
  const extension = normalizeExtension(input);
  return extension ? EXTENSION_TO_MIME[extension] : null;
}

function getExtensionFromMimeType(input?: string | null): string | null {
  const mimeType = normalizeMimeType(input);
  return mimeType ? MIME_TO_EXTENSION[mimeType] : null;
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

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function resolveLocalPublicPath(imagePath: string): Promise<string> {
  const publicRoot = path.resolve(process.cwd(), "public");
  const normalizedPath = stripQueryAndHash(imagePath).replace(/\\/g, "/").trim();
  const relativePath = normalizedPath.replace(/^\/+/, "");

  if (!relativePath || relativePath.includes("..")) {
    throw new Error("Invalid local image path");
  }

  const directCandidate = path.resolve(publicRoot, relativePath);
  if (!directCandidate.startsWith(publicRoot)) {
    throw new Error("Local image path escapes public directory");
  }

  if (await pathExists(directCandidate)) {
    return directCandidate;
  }

  const parsed = path.parse(directCandidate);
  const preferredExtension = normalizeExtension(parsed.ext);
  const extensionsToTry = preferredExtension
    ? [preferredExtension, ...Object.keys(EXTENSION_TO_MIME).filter((ext) => ext !== preferredExtension)]
    : Object.keys(EXTENSION_TO_MIME);

  for (const extension of extensionsToTry) {
    const fallbackCandidate = path.resolve(parsed.dir, `${parsed.name}.${extension}`);
    if (!fallbackCandidate.startsWith(publicRoot)) {
      continue;
    }

    if (await pathExists(fallbackCandidate)) {
      return fallbackCandidate;
    }
  }

  throw new Error(`Local image not found: ${normalizedPath}`);
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
    "jpg";

  return {
    buffer,
    extension,
    mimeType,
    originalName: path.basename(remoteUrl.pathname) || null,
    sourceLabel: remoteUrl.toString(),
  };
}

async function resolveLocalSource(imagePath: string): Promise<ResolvedUploadSource> {
  const resolvedPath = await resolveLocalPublicPath(imagePath);
  const extension = normalizeExtension(path.extname(resolvedPath));
  const mimeType = getMimeTypeFromExtension(extension);

  if (!extension || !mimeType) {
    throw new Error("Unsupported local image type");
  }

  return {
    buffer: await fs.readFile(resolvedPath),
    extension,
    mimeType,
    originalName: path.basename(resolvedPath) || null,
    sourceLabel: imagePath,
  };
}

async function resolveBrowserFile(file: File): Promise<ResolvedUploadSource> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType =
    normalizeMimeType(file.type) ??
    getMimeTypeFromExtension(path.extname(file.name));

  if (!mimeType) {
    throw new Error("Invalid file type");
  }

  const extension =
    normalizeExtension(path.extname(file.name)) ??
    getExtensionFromMimeType(mimeType) ??
    "jpg";

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
    : resolveLocalSource(input.imageUrl);
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
