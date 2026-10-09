// Lightweight browser error capture. The full Sentry SDK stays on the server
// so storefront visitors do not pay its download and main-thread cost.

import {
  reportClientError,
  type ClientErrorContext,
} from "@/lib/client-error-reporting";

const MAX_QUEUED_ERRORS = 10;
const REPORTING_FALLBACK_DELAY_MS = 60_000;

type QueuedError = {
  context: ClientErrorContext;
  error: unknown;
};

const queuedErrors: QueuedError[] = [];
let reportingActive = false;
let activationScheduled = false;

function captureError(error: unknown, context: ClientErrorContext) {
  if (reportingActive) {
    void reportClientError(error, context);
    return;
  }

  if (queuedErrors.length < MAX_QUEUED_ERRORS) {
    queuedErrors.push({ error, context });
  }
}

function handleEarlyError(event: ErrorEvent) {
  captureError(event.error ?? new Error(event.message), {
    kind: "error",
    source: event.filename,
    line: event.lineno,
    column: event.colno,
  });
}

function handleEarlyRejection(event: PromiseRejectionEvent) {
  captureError(event.reason, { kind: "unhandled-rejection" });
}

function activateReporting() {
  if (reportingActive) return;
  reportingActive = true;

  queuedErrors.splice(0).forEach(({ error, context }) => {
    void reportClientError(error, context);
  });
}

function activateWhenIdle() {
  if (activationScheduled || reportingActive) return;
  activationScheduled = true;

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(activateReporting, { timeout: 3_000 });
    return;
  }

  globalThis.setTimeout(activateReporting, 1_000);
}

if (typeof window !== "undefined") {
  window.addEventListener("error", handleEarlyError);
  window.addEventListener("unhandledrejection", handleEarlyRejection);

  (["pointerdown", "keydown", "touchstart"] as const).forEach((eventName) => {
    window.addEventListener(eventName, activateWhenIdle, {
      once: true,
      passive: true,
    });
  });

  window.setTimeout(activateReporting, REPORTING_FALLBACK_DELAY_MS);
}

// Navigation performance tracing is intentionally disabled.
export function onRouterTransitionStart() {}
