"use client";

import { isKnownClientErrorNoise } from "@/lib/client-error-noise";

export type ClientErrorContext = {
  column?: number;
  kind?: "error" | "global-error" | "unhandled-rejection";
  line?: number;
  source?: string;
};

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name || "Error",
      message: error.message || "Unknown browser error",
      stack: error.stack?.slice(0, 8_000),
    };
  }

  if (typeof error === "string") {
    return { name: "Error", message: error.slice(0, 1_000) };
  }

  try {
    return {
      name: "Error",
      message: JSON.stringify(error).slice(0, 1_000),
    };
  } catch {
    return { name: "Error", message: "Unknown browser error" };
  }
}

export async function reportClientError(
  error: unknown,
  context: ClientErrorContext = {}
) {
  if (typeof window === "undefined") return;

  const details = serializeError(error);
  if (isKnownClientErrorNoise(details, context)) return;

  const payload = JSON.stringify({
    ...details,
    context,
    page: `${window.location.origin}${window.location.pathname}`,
    userAgent: window.navigator.userAgent.slice(0, 500),
  });

  try {
    await fetch("/api/client-errors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      credentials: "same-origin",
      keepalive: true,
    });
  } catch {
    // Error reporting must never interfere with the storefront experience.
  }
}
