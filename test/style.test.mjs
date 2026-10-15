// Browserless check of the panel's CSS (src/style.css): it is plain CSS, not a JS string, so it carries no JS-string escapes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("the panel's CSS holds its glyphs as characters, not as doubled escapes", () => {
  const css = readFileSync(new URL("../src/style.css", import.meta.url), "utf8");
  assert.doesNotMatch(css, /\\\\/, "a doubled backslash reaches the page as a backslash and letters (v0.1.75's carets)");
  assert.match(css, /\.caret::before \{ content: "▾"; \}/, "the open fold caret");
  assert.match(css, /\.caret::before \{ content: "▸"; \}/, "the folded caret");
});
