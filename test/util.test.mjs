// Browserless checks of the pure helpers (src/util.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { sides, num, fmt, camel, squash } from "../src/util.js";

test("sides maps physical and logical padding/margin properties", () => {
  assert.deepEqual(sides("padding"), { kind: "padding", sides: { t: 1, r: 1, b: 1, l: 1 } });
  assert.deepEqual(sides("margin-left").sides, { l: 1 });
  assert.deepEqual(sides("padding-inline-start").sides, { l: 1 });
  assert.deepEqual(sides("padding-inline-start", { writingMode: "horizontal-tb", direction: "rtl" }).sides, { r: 1 });
  assert.deepEqual(sides("margin-block", { writingMode: "vertical-rl", direction: "ltr" }).sides, { r: 1, l: 1 });
  assert.equal(sides("color"), null);
});

test("number and text helpers", () => {
  assert.equal(num("12.5px"), 12.5);
  assert.equal(num("auto"), 0);
  assert.equal(fmt(12.3456), "12.35");
  assert.equal(camel("border-top-width"), "borderTopWidth");
  assert.equal(squash("  a \n b  "), "a b");
});
