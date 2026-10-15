// Browserless checks of the undo stack (src/history.js).
import { test } from "node:test";
import assert from "node:assert/strict";
import { History } from "../src/history.js";

test("push, pop and clear report the length", () => {
  const seen = [];
  const h = new History((n) => seen.push(n), 3);
  h.push("a"); h.push("b"); h.push("c"); h.push("d");
  assert.equal(h.length, 3, "capped");
  assert.equal(h.pop(), "d");
  assert.equal(h.pop(), "c");
  assert.equal(h.some((e) => e === "a"), false, "the oldest entry fell off the cap");
  h.clear();
  assert.equal(h.pop(), undefined);
  assert.deepEqual(seen, [1, 2, 3, 3, 2, 1, 0, 0]);
});
