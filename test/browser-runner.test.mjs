import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, copyFileSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function run(files, selection = []) {
  const dir = mkdtempSync(join(tmpdir(), "inspector-runner-"));
  try {
    copyFileSync(new URL("../tests/run-all.mjs", import.meta.url), join(dir, "run-all.mjs"));
    for (const [name, code] of Object.entries(files)) writeFileSync(join(dir, `test-${name}.mjs`), code);
    const child = spawnSync(process.execPath, ["run-all.mjs", "check", ...selection], { cwd: dir, encoding: "utf8" });
    return { status: child.status, summary: JSON.parse(readFileSync(join(dir, "runs/check/_summary.json"), "utf8")) };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test("browser runner propagates a failed suite and still records later suites", () => {
  const r = run({ a: "process.exitCode = 2;", b: "console.log('completed');" });
  assert.equal(r.status, 1);
  assert.equal(r.summary.completed, 2);
  assert.equal(r.summary.failed, 1);
  assert.deepEqual(r.summary.results.map((x) => x.exitCode), [2, 0]);
});
test("browser runner succeeds when every selected suite succeeds", () => {
  const r = run({ ok: "console.log('completed');" });
  assert.equal(r.status, 0);
  assert.equal(r.summary.failed, 0);
});
test("browser runner rejects an empty selection", () => {
  const r = run({ ok: "" }, ["missing"]);
  assert.equal(r.status, 1);
  assert.equal(r.summary.completed, 0);
});
