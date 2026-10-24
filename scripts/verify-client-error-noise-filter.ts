import assert from "node:assert/strict";

import { isKnownClientErrorNoise } from "../lib/client-error-noise";

assert.equal(
  isKnownClientErrorNoise(
    {
      message: "Script error.",
      stack: "Error: Script error.\n    at handleEarlyError",
    },
    { kind: "error", source: "", line: 0, column: 0 }
  ),
  true,
  "An unattributable cross-origin Script error must be ignored"
);

assert.equal(
  isKnownClientErrorNoise(
    { message: "Script error" },
    { kind: "error", source: "", line: 0, column: 0 }
  ),
  true,
  "Browsers that omit the trailing period must also be covered"
);

assert.equal(
  isKnownClientErrorNoise(
    { message: "Script error." },
    {
      kind: "error",
      source: "https://www.cesareshop.com/_next/static/chunks/app.js",
      line: 42,
      column: 7,
    }
  ),
  false,
  "A Script error with an attributable application source must remain reportable"
);

assert.equal(
  isKnownClientErrorNoise(
    { message: "A real checkout failure" },
    { kind: "error", source: "", line: 0, column: 0 }
  ),
  false,
  "Other client errors must remain reportable"
);

assert.equal(
  isKnownClientErrorNoise(
    { message: "Script error.", stack: "at checkout (app:///checkout.js:1:1)" },
    { kind: "global-error" }
  ),
  false,
  "Explicitly reported application errors must remain reportable"
);

console.log("Client error noise filter verification passed.");
