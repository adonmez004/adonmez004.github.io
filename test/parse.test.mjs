// Browserless checks of the pure CSS reader (src/css/parse.js): run with `npm run test:unit`.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBlock, parseDecls, scanTo, matchBrace, resolveSelector } from "../src/css/parse.js";

const lines = (src) => (i) => src.slice(0, i).split("\n").length;
const parse = (src) => parseBlock(src, 0, src.length, lines(src))[0];

test("rules, comments and blank lines come back in order", () => {
  const src = `/* head */\n.a { color: red; }\n\n\n.b { margin: 0 }`;
  const nodes = parse(src);
  assert.deepEqual(nodes.map((n) => n.type), ["comment", "rule", "blank", "rule"]);
  assert.equal(nodes[1].head, ".a");
  assert.equal(nodes[1].line, 2);
  assert.deepEqual(nodes[1].decls, [{ type: "decl", prop: "color", value: "red", important: false, on: true }]);
});

test("conditional at-rules nest, keyframes stay opaque, @import is flat", () => {
  const src = `@import url(x.css);\n@media (min-width: 40em) { .a { gap: 1rem } }\n@keyframes spin { to { rotate: 1turn } }`;
  const nodes = parse(src);
  assert.deepEqual(nodes.map((n) => n.type), ["flat", "group", "opaque"]);
  assert.equal(nodes[1].children[0].head, ".a");
  assert.equal(nodes[2].head, "@keyframes spin");
});

test("declarations: !important, custom properties holding blocks, nested rules skipped", () => {
  const src = `color: red !important; --x: { a: b }; .child { color: blue } padding: 1px; /* note */ BORDER: 0`;
  const items = parseDecls(src, 0, src.length);
  assert.deepEqual(items.map((d) => d.prop ?? d.type), ["color", "--x", "padding", "comment", "border"]);
  assert.equal(items[0].important, true);
  assert.equal(items[0].value, "red");
  assert.equal(items[1].value, "{ a: b }");
});

test("scanTo honours quotes, parentheses and comments", () => {
  const src = `a[href="x;y"] /* ; */ url(a;b) { x }`;
  assert.equal(src[scanTo(src, 0, src.length, "{;")], "{");
  assert.equal(matchBrace(src, src.indexOf("{"), src.length), src.length - 1);
});

test("resolveSelector expands & and implicit descendants", () => {
  assert.equal(resolveSelector("& .title", ".card"), ":is(.card) .title");
  assert.equal(resolveSelector(".title", ".card"), ":is(.card) :is(.title)");
  assert.equal(resolveSelector(".a", null), ".a");
});
