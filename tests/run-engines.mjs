// The critical four on Firefox and WebKit in turn: `node tests/run-engines.mjs <label>` writes runs/ff-<label>/ and runs/wk-<label>/ and exits 1 when either engine's run failed
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
const label = process.argv[2];
if (!label) { console.error("usage: node tests/run-engines.mjs <label>"); process.exit(1); }
const runAll = path.join(path.dirname(fileURLToPath(import.meta.url)), "run-all.mjs");
const suites = ["sources", "sizelinks", "v021", "review-regressions"];
let failed = false;
for (const [engine, prefix] of [["firefox", "ff"], ["webkit", "wk"]]) {
  console.log(`== ${engine}: ${prefix}-${label}`);
  const result = spawnSync(process.execPath, [runAll, `${prefix}-${label}`, ...suites], { stdio: "inherit", env: { ...process.env, PW_BROWSER: engine } });
  if (result.status !== 0) failed = true;
}
process.exit(failed ? 1 : 0);
