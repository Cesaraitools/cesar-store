// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const isProduction = process.env.NODE_ENV === "production";

function isFacebookIosWebKitBridgeNoise(event: Sentry.Event) {
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

function isFacebookAndroidNavigationBridgeNoise(event: Sentry.Event) {
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

function isInjectedPanelNullReadNoise(event: Sentry.Event) {
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

function isVercelLiveFeedbackRangeNoise(event: Sentry.Event) {
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

Sentry.init({
  dsn: "https://c66fec97c01df290b8e7884f524c864d@o4511319727865856.ingest.de.sentry.io/4511319729766480",

  // Add optional integrations for additional features
  integrations: [Sentry.replayIntegration()],

  // Keep error monitoring active while reducing production tracing overhead.
  tracesSampleRate: isProduction ? 0.1 : 1,
  // Enable logs to be sent to Sentry
  enableLogs: !isProduction,

  // Define how likely Replay events are sampled.
  // Avoid recording normal production sessions; keep error replays enabled below.
  replaysSessionSampleRate: isProduction ? 0 : 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  beforeSend(event) {
    if (
      isFacebookIosWebKitBridgeNoise(event) ||
      isFacebookAndroidNavigationBridgeNoise(event) ||
      isInjectedPanelNullReadNoise(event) ||
      isVercelLiveFeedbackRangeNoise(event)
    ) {
      return null;
    }

    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
