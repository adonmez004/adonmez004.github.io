// Runs every test-*.mjs suite in turn and writes each one's output under runs/<label>/; diff two labels to compare builds.
import { spawn } from "node:child_process";
import { readdirSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
const here = path.dirname(new URL(import.meta.url).pathname);
const label = process.argv[2] || new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
const only = process.argv.slice(3);
const out = path.join(here, "runs", label);
mkdirSync(out, { recursive: true });
const suites = readdirSync(here).filter((f) => /^test-.*\.mjs$/.test(f) && (!only.length || only.includes(f.replace(/^test-|\.mjs$/g, "")))).sort();
const summary = [];
const results = [];
if (!suites.length) {
  console.error("No browser suites matched the selection.");
  process.exitCode = 1;
}
for (const file of suites) {
  const name = file.replace(/^test-|\.mjs$/g, "");
  const t0 = Date.now();
  const res = await new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(here, file)], { cwd: out, env: { ...process.env } });
    let text = "";
    child.stdout.on("data", (d) => (text += d));
    child.stderr.on("data", (d) => (text += d));
    const timer = setTimeout(() => { child.kill("SIGKILL"); text += "\n[TIMEOUT 240s]"; }, 240000);
    child.on("error", (error) => { text += `\n[SPAWN ERROR] ${error.message}`; });
    child.on("close", (code, signal) => { clearTimeout(timer); resolve({ code, signal, text }); });
  });
  writeFileSync(path.join(out, name + ".txt"), res.text);
  const line = `${name}\texit ${res.code}\t${((Date.now() - t0) / 1000).toFixed(1)}s`;
  summary.push(line);
  results.push({ name, exitCode: res.code, signal: res.signal, durationMs: Date.now() - t0 });
  if (res.code !== 0) process.exitCode = 1;
  console.log(line);
}
writeFileSync(path.join(out, "_summary.txt"), summary.join("\n") + "\n");
writeFileSync(path.join(out, "_summary.json"), JSON.stringify({ completed: results.length, failed: results.filter((r) => r.exitCode !== 0).length, results }, null, 2) + "\n");
