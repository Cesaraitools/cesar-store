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
    if (isFacebookIosWebKitBridgeNoise(event)) {
      return null;
    }

    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
