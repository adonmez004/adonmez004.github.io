// Compares two run-all labels suite by suite; prints each suite whose output differs (timing lines ignored) with a short diff.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
const here = path.dirname(new URL(import.meta.url).pathname);
const [a, b] = process.argv.slice(2);
if (!a || !b) { console.error("Usage: node tests/compare.mjs <baseline> <candidate>"); process.exit(2); }
const dirA = path.join(here, "runs", a), dirB = path.join(here, "runs", b);
const norm = (t) => t.replace(/\d+(\.\d+)?\s?ms\b/g, "Nms").replace(/duration_ms: [\d.]+/g, "").replace(/\x1b\[[0-9;]*m/g, "").split("\n").filter((l) => !/^\s*at /.test(l)).join("\n");
let same = 0, diff = 0, missing = 0;
const files = [...new Set([...readdirSync(dirA), ...readdirSync(dirB)])].filter((f) => f.endsWith(".txt") && !f.startsWith("_")).sort();
for (const f of files) {
  if (!existsSync(path.join(dirA, f))) { console.log(`${f}: missing in ${a}`); missing++; continue; }
  const pb = path.join(dirB, f);
  if (!existsSync(pb)) { console.log(`${f}: missing in ${b}`); missing++; continue; }
  const ta = norm(readFileSync(path.join(dirA, f), "utf8")), tb = norm(readFileSync(pb, "utf8"));
  if (ta === tb) { same++; continue; }
  diff++;
  const la = ta.split("\n"), lb = tb.split("\n");
  console.log(`\n=== ${f} differs (${la.length} vs ${lb.length} lines)`);
  for (let i = 0, shown = 0; i < Math.max(la.length, lb.length) && shown < 8; i++) if (la[i] !== lb[i]) { console.log(`  -${a}: ${la[i] ?? ""}\n  +${b}: ${lb[i] ?? ""}`); shown++; }
}
console.log(`\n${same} same, ${diff} differ, ${missing} missing`);
if (diff || missing) process.exitCode = 1;
