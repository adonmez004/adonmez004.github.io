import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function compare(a, b) {
  const dir = mkdtempSync(join(tmpdir(), "inspector-compare-"));
  try {
    copyFileSync(new URL("../tests/compare.mjs", import.meta.url), join(dir, "compare.mjs"));
    for (const [label, files] of [["a", a], ["b", b]]) {
      const folder = join(dir, "runs", label); mkdirSync(folder, { recursive: true });
      for (const [name, content] of Object.entries(files)) writeFileSync(join(folder, name + ".txt"), content);
    }
    return spawnSync(process.execPath, ["compare.mjs", "a", "b"], { cwd: dir, encoding: "utf8" });
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
test("browser comparison ignores timing noise in matching observations", () => {
  assert.equal(compare({ first: "done 20ms" }, { first: "done 80ms" }).status, 0);
});
test("browser comparison fails on changed or missing suite output in either direction", () => {
  const r = compare({ first: "old", removed: "x" }, { first: "new", added: "x" });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /1 differ, 2 missing/);
});
