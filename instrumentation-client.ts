// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import type { Event as SentryEvent } from "@sentry/nextjs";
import {
  isInjectedRuntimeStreamReaderNoise,
} from "@/lib/sentry-client-noise-filters";

const MAX_QUEUED_ERRORS = 10;
const SENTRY_FALLBACK_DELAY_MS = 60_000;
const queuedErrors: unknown[] = [];
let sentryInitializationStarted = false;

function isFacebookIosWebKitBridgeNoise(event: SentryEvent) {
  const exceptionValues = event.exception?.values ?? [];

  return exceptionValues.some((exception) => {
    const value = exception.value ?? "";
    const frames = exception.stacktrace?.frames ?? [];
    const hasWebKitMessageHandlersError = value.includes(
      "window.webkit.messageHandlers"
    );
    const hasFacebookBridgeFrame = frames.some((frame) => {
      const filename = frame.filename ?? "";
      const functionName = frame.function ?? "";

      return filename.startsWith("app:///") || functionName === "sendDataToNative";
    });

    return hasWebKitMessageHandlersError && hasFacebookBridgeFrame;
  });
}

function isFacebookAndroidNavigationBridgeNoise(event: SentryEvent) {
  const exceptionValues = event.exception?.values ?? [];

  return exceptionValues.some((exception) => {
    const value = exception.value ?? "";
    const frames = exception.stacktrace?.frames ?? [];
    const hasFacebookNavigationBridgeFrame = frames.some((frame) => {
      const filename = (frame.filename ?? "").replace(/^app:\/\/\/?/, "");
      const functionName = frame.function ?? "";

      return (
        filename === "navigation_performance_logger_android" &&
        (functionName === "sendDataToNative" ||
          functionName === "sendJsBlockingTimeMessage")
      );
    });

    return (
      exception.type === "Error" &&
      value === "Error invoking postMessage: Java object is gone" &&
      hasFacebookNavigationBridgeFrame
    );
  });
}

function isInjectedPanelNullReadNoise(event: SentryEvent) {
  const noisyMessages = new Set([
    "Cannot read properties of null (reading 'document')",
    "Cannot read properties of null (reading 'live')",
  ]);
  const exceptionValues = event.exception?.values ?? [];

  return exceptionValues.some((exception) => {
    const value = exception.value ?? "";
    const frames = exception.stacktrace?.frames ?? [];
    const hasInjectedPanelFrame = frames.some((frame) => {
      const filename = frame.filename ?? "";

      return (
        filename === "app:///panel.js" ||
        filename === "app:///vendors-async.js"
      );
    });

    return noisyMessages.has(value) && hasInjectedPanelFrame;
  });
}

function isVercelLiveFeedbackRangeNoise(event: SentryEvent) {
  const exceptionValues = event.exception?.values ?? [];

  return exceptionValues.some((exception) => {
    const value = exception.value ?? "";
    const frames = exception.stacktrace?.frames ?? [];
    const hasLiveFeedbackFrame = frames.some((frame) => {
      const filename = frame.filename ?? "";

      return filename.startsWith("app:///_next-live/feedback/");
    });

    return (
      exception.type === "InvalidNodeTypeError" &&
      value.includes("Failed to execute 'selectNode' on 'Range'") &&
      hasLiveFeedbackFrame
    );
  });
}

function enqueueError(value: unknown) {
  if (queuedErrors.length < MAX_QUEUED_ERRORS) {
    queuedErrors.push(value);
  }
}

function handleEarlyError(event: ErrorEvent) {
  enqueueError(event.error ?? new Error(event.message));
}

function handleEarlyRejection(event: PromiseRejectionEvent) {
  enqueueError(event.reason);
}

async function initializeSentry() {
  if (sentryInitializationStarted) return;
  sentryInitializationStarted = true;

  try {
    const Sentry = await import("@sentry/nextjs");

    Sentry.init({
      dsn: "https://c66fec97c01df290b8e7884f524c864d@o4511319727865856.ingest.de.sentry.io/4511319729766480",

      // Browser error reporting stays enabled, but Replay and client-side
      // tracing are intentionally omitted. Server/edge tracing remains active
      // in sentry.server.config.ts and sentry.edge.config.ts.
      enableLogs: process.env.NODE_ENV !== "production",

      // Enable sending user PII (Personally Identifiable Information)
      // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
      sendDefaultPii: true,

      beforeSend(event) {
        if (
          isFacebookIosWebKitBridgeNoise(event) ||
          isFacebookAndroidNavigationBridgeNoise(event) ||
          isInjectedPanelNullReadNoise(event) ||
          isVercelLiveFeedbackRangeNoise(event) ||
          isInjectedRuntimeStreamReaderNoise(event)
        ) {
          return null;
        }

        return event;
      },
    });

    queuedErrors.splice(0).forEach((error) => {
      Sentry.captureException(error);
    });
  } finally {
    window.removeEventListener("error", handleEarlyError);
    window.removeEventListener("unhandledrejection", handleEarlyRejection);
  }
}

function initializeWhenIdle() {
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(() => void initializeSentry(), { timeout: 3_000 });
    return;
  }

  globalThis.setTimeout(() => void initializeSentry(), 1_000);
}

if (typeof window !== "undefined") {
  window.addEventListener("error", handleEarlyError);
  window.addEventListener("unhandledrejection", handleEarlyRejection);

  (["pointerdown", "keydown", "touchstart"] as const).forEach((eventName) => {
    window.addEventListener(eventName, initializeWhenIdle, {
      once: true,
      passive: true,
    });
  });

  window.setTimeout(() => void initializeSentry(), SENTRY_FALLBACK_DELAY_MS);
}

// Navigation tracing is intentionally disabled; exporting the hook keeps the
// Next.js/Sentry integration contract explicit without adding tracing code.
export function onRouterTransitionStart() {}
