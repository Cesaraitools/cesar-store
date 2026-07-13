// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const isProduction = process.env.NODE_ENV === "production";

Sentry.init({
  dsn: "https://c66fec97c01df290b8e7884f524c864d@o4511319727865856.ingest.de.sentry.io/4511319729766480",

  // Keep error monitoring active while reducing production tracing overhead.
  tracesSampleRate: isProduction ? 0.1 : 1,

  // Enable logs to be sent to Sentry
  enableLogs: !isProduction,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,
});
