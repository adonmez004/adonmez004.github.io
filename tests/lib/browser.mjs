// Shared bits for the suites: the browser (PW_BROWSER=chromium|firefox|webkit, chromium by default; BROWSER itself is taken by VS Code), the inspector build under test (INSPECTOR=<path>, the repo's own build by default; CHROME=<binary> for another Chromium, QR_DIR=<dir> for the QR solution),
// a local server for the QR solution (or any html string), and a coarse visual signature of a screenshot.
import { chromium, firefox, webkit } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto";

export const INSPECTOR = process.env.INSPECTOR || new URL("../../inspector.js", import.meta.url).pathname; // the build under test: the repo's own unless INSPECTOR names another
export const BROWSER = process.env.PW_BROWSER || "chromium";
const CHROME = process.env.CHROME; // another Chromium binary; Playwright's own by default

export async function launch(options = {}) {
  const engine = { chromium, firefox, webkit }[BROWSER] || chromium;
  return engine.launch(BROWSER === "chromium" && CHROME ? { executablePath: CHROME, ...options } : options);
}

// v0.2 (the rail): there is no pill and no tab. The rail's HTML / CSS icon arms a lens, a click on a page element opens the box on that view scoped
// to the element, and Show All widens the view to every stylesheet / the whole tree. `openBox` does that in one call; `which` is "html" or "css",
// `at` the page element to click (its top-left corner, 12px in or the corner radius, so a rounded card takes the click), `all` presses Show All. Calling it for the other view closes the open box and reopens it.
export async function openBox(page, host, which = "html", { all = true, at = "main" } = {}) {
  const armed = await page.evaluate((w) => document.querySelector("fm-inspector").lens?.armed === w, which);
  if (!armed) { await host.locator(which === "css" ? ".cssbtn" : ".htmlbtn").click(); await page.waitForTimeout(150); }
  const [x, y] = await page.evaluate((s) => { const el = document.querySelector(s) || document.body.firstElementChild; const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); const inset = Math.min(Math.max(12, parseFloat(cs.borderTopLeftRadius) || 0), r.width / 2, r.height / 2); return [r.left + inset, r.top + inset]; }, at); // inside a rounded corner too
  await page.mouse.click(x, y); await page.waitForTimeout(400);
  if (all) { const vall = host.locator(".vall"); if (await vall.getAttribute("aria-pressed") !== "true") { await vall.click(); await page.waitForTimeout(300); } }
}
export const park = (page) => page.evaluate(() => { const h = document.querySelector("fm-inspector"); h.moveTo(innerWidth - h.panel.offsetWidth - 8, 8); }); // the box to the left edge: the size view opens over a right-side element's handle otherwise
export const shadow = (page, fn, arg) => page.evaluate(([f, a]) => new Function("sh", "host", "arg", `return (${f})(sh, host, arg)`)(document.querySelector("fm-inspector").shadowRoot, document.querySelector("fm-inspector"), a), [fn.toString(), arg]); // run fn(shadowRoot, host, arg) in the page

export const routeInspector = (page) => page.route("**/inspector.js", (r) => r.fulfill({ path: INSPECTOR, contentType: "text/javascript" }));
export const blockFonts = (page) => page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort()); // the fallback font alone: a screenshot that reads the same every run

const QR = process.env.QR_DIR || new URL("../../../qr-code-component/", import.meta.url).pathname; // the QR solution checked out beside the repo, or QR_DIR
const TYPES = { ".css": "text/css", ".png": "image/png", ".html": "text/html; charset=utf-8" };
export function serve(html = null) {
  // A local http origin: the QR solution's files, or one html string at every path
  const srv = http.createServer((q, r) => {
    const url = q.url.split("?")[0];
    if (html != null) { r.setHeader("content-type", TYPES[".html"]); return r.end(html); }
    const f = path.join(QR, url === "/" ? "index.html" : url);
    try { r.setHeader("content-type", TYPES[path.extname(f)] || "application/octet-stream"); r.end(fs.readFileSync(f)); } catch { r.statusCode = 404; r.end(); }
  }).listen(0);
  return { url: `http://127.0.0.1:${srv.address().port}/`, close: () => srv.close() };
}

export async function signature(page, png) {
  // A 16x9 grid of mean luminance (two hex digits each) and the PNG's sha256: the grid reads the same across anti-aliasing noise, the hash says "identical"
  const data = `data:image/png;base64,${png.toString("base64")}`;
  const grid = await page.evaluate(async (src) => {
    const img = new Image(); img.src = src; await img.decode();
    const c = document.createElement("canvas"); c.width = 16; c.height = 9;
    const ctx = c.getContext("2d"); ctx.drawImage(img, 0, 0, 16, 9);
    const px = ctx.getImageData(0, 0, 16, 9).data; let out = "";
    for (let i = 0; i < px.length; i += 4) out += Math.round((px[i] * 0.299 + px[i + 1] * 0.587 + px[i + 2] * 0.114) / 16).toString(16);
    return out;
  }, data);
  return { grid, sha: crypto.createHash("sha256").update(png).digest("hex").slice(0, 12) };
}
