import { test } from "node:test";
import assert from "node:assert/strict";
import { candidates } from "../src/panel/css-view.js";

test("logical declaration candidates follow RTL and vertical writing modes", () => {
  assert.ok(candidates("padding-right", { direction: "rtl" }).includes("padding-inline-start"));
  assert.ok(!candidates("padding-left", { direction: "rtl" }).includes("padding-inline-start"));
  assert.ok(candidates("padding-right", { writingMode: "vertical-rl" }).includes("padding-block-start"));
  assert.ok(candidates("width", { writingMode: "vertical-rl" }).includes("block-size"));
  assert.ok(candidates("padding-bottom", { writingMode: "sideways-lr" }).includes("padding-inline-start"));
});
test("border longhands reach the logical shorthands over them, corners map by their two sides, size twins are min/max only", () => {
  const left = candidates("border-left-width");
  for (const c of ["border-inline-start-width", "border-inline-start", "border-inline-width", "border-inline", "border-width", "border"]) assert.ok(left.includes(c), c);
  assert.ok(!left.includes("border-left-inline-size"));
  assert.ok(candidates("border-top-left-radius").includes("border-start-start-radius"));
  assert.ok(candidates("border-top-left-radius", { direction: "rtl" }).includes("border-start-end-radius"));
  assert.ok(candidates("border-top-left-radius", { writingMode: "vertical-rl" }).includes("border-end-start-radius"));
  assert.ok(candidates("border-start-start-radius").includes("border-top-left-radius"));
  assert.ok(candidates("border-start-start-radius", { direction: "rtl" }).includes("border-top-right-radius"));
  assert.ok(candidates("border-top-left-radius").includes("border-radius") && !candidates("border-top-left-radius").includes("border-block-start-left-radius"));
  assert.ok(candidates("min-width", { writingMode: "vertical-rl" }).includes("min-block-size"));
  assert.ok(!candidates("outline-width").includes("outline-inline-size"));
});
test("the size families keep their twins in every writing mode, and border or outline widths are no sizes", () => {
  for (const [mode, width, height] of [["horizontal-tb", "inline-size", "block-size"], ["vertical-rl", "block-size", "inline-size"], ["vertical-lr", "block-size", "inline-size"], ["sideways-rl", "block-size", "inline-size"], ["sideways-lr", "block-size", "inline-size"]]) for (const direction of ["ltr", "rtl"]) {
    const style = { writingMode: mode, direction };
    for (const pre of ["min-", "max-", "contain-intrinsic-"]) for (const [ph, lg] of [["width", width], ["height", height]]) {
      assert.ok(candidates(pre + ph, style).includes(pre + lg), `${mode} ${direction}: ${pre}${ph}`);
      assert.ok(candidates(pre + lg, style).includes(pre + ph), `${mode} ${direction}: ${pre}${lg}`);
    }
    assert.ok(!candidates("border-left-width", style).includes("border-left-inline-size") && !candidates("outline-width", style).includes("outline-inline-size"));
  }
  assert.ok(candidates("contain-intrinsic-inline-size").includes("contain-intrinsic-size"));
});
test("all is a candidate except for properties the reset excludes", () => {
  assert.ok(candidates("display").includes("all"));
  for (const prop of ["direction", "unicode-bidi", "--theme"]) assert.ok(!candidates(prop).includes("all"));
  assert.ok(candidates("border-top-color").includes("border"));
});
