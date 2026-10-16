// The resize tool against the page's own writes (v0.2: the undo and Reset sizes doors have no control yet, the host's sizeUndo() / sizeResetAll() drive them; the hold's words come from the box's .wblock without its door): a page write surviving undo / the handle's Reset / Reset sizes, a page overwrite skipped by undo, !important kept, keyboard steps, a transformed element, the target removed mid-drag
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const QR = (process.env.QR_DIR || new URL("../../qr-code-component/", import.meta.url).pathname), LOCAL = (process.env.INSPECTOR || new URL("../inspector.js", import.meta.url).pathname);
const srv = http.createServer((q, r) => { const u = q.url.split("?")[0]; const f = path.join(QR, u === "/" ? "index.html" : u); try { r.setHeader("content-type", f.endsWith(".css") ? "text/css" : f.endsWith(".png") ? "image/png" : "text/html"); r.end(fs.readFileSync(f)); } catch { r.statusCode = 404; r.end(); } }).listen(0);
const browser = await chromium.launch();
const errors = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } }); page.on("pageerror", (e) => errors.push(e.message));
await page.route("https://demo.frontendmentorsolutions.io/inspector.js", (r) => r.fulfill({ path: LOCAL, contentType: "text/javascript" }));
await page.goto(`http://127.0.0.1:${srv.address().port}/`, { waitUntil: "networkidle" });
const host = page.locator("fm-inspector");
const st = (sel) => page.evaluate((s) => { const e = document.querySelector(s); return { w: Math.round(e.getBoundingClientRect().width), style: e.getAttribute("style"), warn: [...document.querySelector("fm-inspector").shadowRoot.querySelector(".wblock").childNodes].filter((n) => !n.classList?.contains("wgo")).map((n) => n.textContent).join("").trim() }; }, sel);
const dragOn = async (sel, dx) => { await page.evaluate((s) => document.querySelector("fm-inspector").chooseSize(document.querySelector(s)), sel); await page.waitForTimeout(200); const b = await host.locator(".hd").boundingBox(); const x = b.x + 6, y = b.y + b.height - 6; await page.mouse.move(x, y); await page.mouse.down(); for (let i = 1; i <= 6; i++) await page.mouse.move(x + dx * i / 6, y); await page.mouse.up(); await page.waitForTimeout(300); };
await host.locator(".sizebtn").click(); await page.waitForTimeout(150);
const sizeUndo = async () => { await page.evaluate(() => document.querySelector("fm-inspector").sizeUndo()); await page.waitForTimeout(300); };
const sizeResetAll = async () => { await page.evaluate(() => document.querySelector("fm-inspector").sizeResetAll()); await page.waitForTimeout(300); };
// 1. a page write after the resize survives undo, Reset and Reset sizes
await dragOn("p", -60); console.log("p narrowed:", await st("p"));
await page.evaluate(() => { document.querySelector("p").style.color = "blue"; }); await page.waitForTimeout(300);
await sizeUndo(); console.log("undo keeps the page's color:", await st("p"), "(expect style 'color: blue;' only, w back)");
await dragOn("p", -60); await host.locator(".hreset").click(); await page.waitForTimeout(300); console.log("handle Reset keeps the color:", await st("p"), "(expect color only)");
await dragOn("p", -60); await sizeResetAll(); console.log("Reset sizes keeps the color:", await st("p"), "(expect color only)");
// 2. the page overwrote the size itself: undo skips that step and says so
await dragOn("p", -60); await page.evaluate(() => { document.querySelector("p").style.setProperty("inline-size", "175px", "important"); }); await page.waitForTimeout(300);
await sizeUndo(); console.log("undo past a page write:", await st("p"), "(expect 175px !important kept, a skipped warning)");
await page.evaluate(() => { document.querySelector("p").setAttribute("style", "color: blue"); }); await page.waitForTimeout(300);
// 3. an existing !important on the size is kept by the drag
await page.evaluate(() => { document.querySelector("h1").style.setProperty("inline-size", "200px", "important"); }); await page.waitForTimeout(300);
await dragOn("h1", 30); console.log("drag keeps !important:", await st("h1"), "(expect 230px !important)");
// 4. keyboard: the handle steps the width
await page.evaluate(() => document.querySelector("fm-inspector").chooseSize(document.querySelector("img"))); await page.waitForTimeout(200);
await host.locator(".hd").focus(); await page.keyboard.press("ArrowLeft"); await page.keyboard.press("Shift+ArrowLeft"); await page.waitForTimeout(300);
console.log("img after Left, Shift+Left:", await st("img"), "(expect 288 - 11 = 277px)");
// 5. a transformed element: the handle is disabled with a note
await page.evaluate(() => { document.querySelector("main").style.transform = "scale(1.1)"; }); await page.waitForTimeout(300);
await page.evaluate(() => document.querySelector("fm-inspector").chooseSize(document.querySelector("p"))); await page.waitForTimeout(300);
console.log("transformed:", await page.evaluate(() => { const sh = document.querySelector("fm-inspector").shadowRoot; return { disabled: sh.querySelector(".hd").disabled, warn: [...sh.querySelector(".wblock").childNodes].filter((n) => !n.classList?.contains("wgo")).map((n) => n.textContent).join("").trim() }; }), "(expect disabled true, transformed note)");
await page.evaluate(() => { document.querySelector("main").style.transform = ""; });
// 6. the target removed mid-drag: no error, the drag ends
await page.evaluate(() => { const p = document.createElement("p"); p.id = "tmp"; p.textContent = "temporary"; document.querySelector("main div").append(p); }); await page.waitForTimeout(300);
await page.evaluate(() => document.querySelector("fm-inspector").chooseSize(document.querySelector("#tmp"))); await page.waitForTimeout(200);
{ const b = await host.locator(".hd").boundingBox(); const x = b.x + 6, y = b.y + b.height - 6; await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x - 20, y); await page.evaluate(() => document.querySelector("#tmp").remove()); await page.waitForTimeout(100); await page.mouse.move(x - 40, y); await page.mouse.up(); await page.waitForTimeout(300); }
console.log("target removed mid-drag:", await page.evaluate(() => { const i = document.querySelector("fm-inspector"); return { drag: !!i.sizeDrag, target: i.sizeTarget?.id || null, sized: i.sized.size }; }), "(expect drag false, target null)");
console.log("errors:", JSON.stringify(errors));
await browser.close(); srv.close();
