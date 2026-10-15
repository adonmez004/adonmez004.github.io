// Builds inspector.js from src/: one IIFE, no runtime dependencies, the version from package.json on the first line and in the host's data-version, the copyright line last.
import { build } from "esbuild";
import { readFileSync } from "node:fs";
const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));
const out = process.argv[2] || "inspector.js";
await build({
  entryPoints: ["src/main.js"],
  bundle: true,
  format: "iife",
  target: "es2022",
  platform: "browser",
  loader: { ".css": "text" },
  charset: "utf8",
  legalComments: "none",
  outfile: out,
  define: { __VERSION__: JSON.stringify(version) },
  banner: { js: `// inspector.js v${version}\n` },
  footer: { js: `\n// Copyright 2026 Alper Donmez. All rights reserved.` },
  logLevel: "warning",
});
console.log(`built ${out} v${version}`);
