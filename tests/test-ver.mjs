// The version: the host's data-version, line 1 of the served inspector.js and the copyright line closing it (v0.2: the head carries no version label; the rail must fit the viewport at both widths)
import { chromium } from "playwright";
const LOCAL = (process.env.INSPECTOR || new URL("../inspector.js", import.meta.url).pathname);
const browser = await chromium.launch();
const errors = [];
for (const [name, width] of [["desktop", 1280], ["phone", 390]]) {
  const ctx = await browser.newContext({ viewport: { width, height: 900 } });
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error" && !/favicon/.test(m.text())) errors.push(m.text()); });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("https://demo.frontendmentorsolutions.io/inspector.js", (r) => r.fulfill({ path: LOCAL, contentType: "text/javascript" }));
  await page.goto("https://demo.frontendmentorsolutions.io/qr-code-component/", { waitUntil: "networkidle" });
  const info = await page.evaluate(async () => { const h = document.querySelector("fm-inspector"); const text = await (await fetch("https://demo.frontendmentorsolutions.io/inspector.js")).text(); const lines = text.trim().split("\n"); const rail = h.shadowRoot.querySelector(".rail").getBoundingClientRect(); return { dataVersion: h.getAttribute("data-version"), line1: lines[0], last: lines.at(-1), agree: lines[0] === `// inspector.js v${h.getAttribute("data-version")}`, railInside: rail.left >= 0 && rail.right <= innerWidth && rail.top >= 0 && rail.bottom <= innerHeight }; });
  console.log(name, JSON.stringify(info));
  await ctx.close();
}
console.log("errors:", errors);
await browser.close();
