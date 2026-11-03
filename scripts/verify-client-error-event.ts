import assert from "node:assert/strict";

import {
  getClientErrorFingerprint,
  getMinifiedReactErrorCode,
  parseClientStack,
} from "../lib/server/client-error-event";

const reactMessage =
  "Minified React error #425; visit https://react.dev/errors/425";

assert.equal(getMinifiedReactErrorCode(reactMessage), "425");
assert.deepEqual(getClientErrorFingerprint(reactMessage), [
  "client-react-error",
  "425",
]);
assert.equal(getClientErrorFingerprint("A checkout error"), undefined);

const safariFrames = parseClientStack(
  [
    "sq@https://www.cesareshop.com/_next/static/chunks/react.js:1:147157",
    "@https://www.cesareshop.com/_next/static/chunks/app.js:1:99805",
  ].join("\n")
);

assert.deepEqual(safariFrames, [
  {
    filename: "https://www.cesareshop.com/_next/static/chunks/app.js",
    function: undefined,
    lineno: 1,
    colno: 99805,
  },
  {
    filename: "https://www.cesareshop.com/_next/static/chunks/react.js",
    function: "sq",
    lineno: 1,
    colno: 147157,
  },
]);

const chromeFrames = parseClientStack(
  "at hydrate (https://www.cesareshop.com/_next/static/chunks/app.js:4:20)"
);

assert.deepEqual(chromeFrames, [
  {
    filename: "https://www.cesareshop.com/_next/static/chunks/app.js",
    function: "hydrate",
    lineno: 4,
    colno: 20,
  },
]);

console.log("Client error event verification passed.");
