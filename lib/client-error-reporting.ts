"use client";

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

function isKnownInjectedNoise(message: string, stack = "") {
  const combined = `${message}\n${stack}`;

  return (
    (/window\.webkit\.messageHandlers/.test(message) &&
      /sendDataToNative|app:\/\//.test(stack)) ||
    (message === "Error invoking postMessage: Java object is gone" &&
      /navigation_performance_logger_android/.test(stack)) ||
    (/Cannot read properties of null \(reading '(document|live)'\)/.test(
      message
    ) && /panel\.js|vendors-async\.js/.test(stack)) ||
    (/Failed to execute 'selectNode' on 'Range'/.test(message) &&
      /_next-live\/feedback/.test(stack)) ||
    (/Cannot read properties of undefined \(reading 'getReader'\)/.test(
      message
    ) && /ext:core\/01_core\.js|<script>/.test(stack)) ||
    /chrome-extension:|moz-extension:/.test(combined)
  );
}

export async function reportClientError(
  error: unknown,
  context: ClientErrorContext = {}
) {
  if (typeof window === "undefined") return;

  const details = serializeError(error);
  if (isKnownInjectedNoise(details.message, details.stack)) return;

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
