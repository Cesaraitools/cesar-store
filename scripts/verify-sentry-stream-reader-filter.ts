import assert from "node:assert/strict";

import { isInjectedRuntimeStreamReaderNoise } from "../lib/sentry-client-noise-filters";

const exactInjectedRuntimeEvent = {
  exception: {
    values: [
      {
        type: "TypeError",
        value: "Cannot read properties of undefined (reading 'getReader')",
        stacktrace: {
          frames: [
            { filename: "ext:core/01_core.js" },
            { filename: "<script>" },
          ],
        },
      },
    ],
  },
};

assert.equal(
  isInjectedRuntimeStreamReaderNoise(exactInjectedRuntimeEvent),
  true
);

assert.equal(
  isInjectedRuntimeStreamReaderNoise({
    exception: {
      values: [
        {
          ...exactInjectedRuntimeEvent.exception.values[0],
          stacktrace: {
            frames: [
              { filename: "app:///<script>" },
              { filename: "app:///ext:core/01_core.js" },
            ],
          },
        },
      ],
    },
  }),
  true
);

assert.equal(
  isInjectedRuntimeStreamReaderNoise({
    exception: {
      values: [
        {
          ...exactInjectedRuntimeEvent.exception.values[0],
          stacktrace: {
            frames: [{ filename: "app:///lib/application-stream.ts" }],
          },
        },
      ],
    },
  }),
  false,
  "An application getReader error must remain reportable"
);

assert.equal(
  isInjectedRuntimeStreamReaderNoise({
    exception: {
      values: [
        {
          ...exactInjectedRuntimeEvent.exception.values[0],
          value: "Cannot read properties of undefined (reading 'prototype')",
        },
      ],
    },
  }),
  false,
  "A nearby injected-runtime error must remain reportable"
);

assert.equal(
  isInjectedRuntimeStreamReaderNoise({
    exception: {
      values: [
        {
          ...exactInjectedRuntimeEvent.exception.values[0],
          type: "Error",
        },
      ],
    },
  }),
  false,
  "A different exception type must remain reportable"
);

console.log("Sentry stream reader noise filter verification passed.");
