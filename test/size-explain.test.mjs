// Browserless checks of the resize tool's pure helper (src/tools/size-explain.js): the grid track tokenizer.
import { test } from "node:test";
import assert from "node:assert/strict";
import { trackTokens } from "../src/tools/size-explain.js";

test("track tokens: line names and comments dropped, repeat() unrolled, auto-fill reduced to its pattern", () => {
  assert.deepEqual(trackTokens("[a] 100px /* x */ [b] 1fr [c]"), ["100px", "1fr"]);
  assert.deepEqual(trackTokens("repeat(3, 100px 1fr) 50px"), ["100px", "1fr", "100px", "1fr", "100px", "1fr", "50px"]);
  assert.deepEqual(trackTokens("repeat(auto-fill, minmax(10rem, 1fr))"), ["minmax(10rem, 1fr)"]);
  assert.deepEqual(trackTokens("minmax(100px, max-content) fit-content(40%)"), ["minmax(100px, max-content)", "fit-content(40%)"]);
  assert.equal(trackTokens("repeat(100000, 1px)").length, 2048, "capped");
});
