import crypto from "crypto";
import {
  SESSION_COOKIE_NAME,
  SESSION_VERSION,
} from "@/lib/admin/constants";

const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET;

if (!ADMIN_SESSION_SECRET) {
  throw new Error("ADMIN_SESSION_SECRET is not set");
}

export type ParsedAdminSession = {
  version: string;
  token: string;
  signature: string;
};

export function parseAdminSessionCookie(
  rawSession: string | undefined
): ParsedAdminSession | null {
  if (!rawSession) return null;

  const [version, payload] = rawSession.split(":");

  if (version !== SESSION_VERSION || !payload) {
    return null;
  }

  const [token, signature] = payload.split(".");

  if (!token || !signature) {
    return null;
  }

  return {
    version,
    token,
    signature,
  };
}

export function verifyAdminSessionSignature(
  token: string,
  signature: string
): boolean {
  const expected = crypto
    .createHmac("sha256", ADMIN_SESSION_SECRET)
    .update(token)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

export {
  SESSION_COOKIE_NAME,
  SESSION_VERSION,
};