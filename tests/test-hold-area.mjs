// The area that held a drag is framed on the page with the reason chip: own max (no frame), the parent's max, the body grid's place-items, no rule at all (v0.2: the resize box, host.sizeResetAll() for the old Reset sizes button)
import { chromium } from "playwright";
import { openBox } from "./lib/browser.mjs";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const QR = (process.env.QR_DIR || new URL("../../qr-code-component/", import.meta.url).pathname), LOCAL = (process.env.INSPECTOR || new URL("../inspector.js", import.meta.url).pathname);
const srv = http.createServer((q, r) => { const u = q.url.split("?")[0]; const f = path.join(QR, u === "/" ? "index.html" : u); try { r.setHeader("content-type", f.endsWith(".css") ? "text/css" : f.endsWith(".png") ? "image/png" : "text/html"); r.end(fs.readFileSync(f)); } catch { r.statusCode = 404; r.end(); } }).listen(0);
const browser = await chromium.launch();
const errors = [];
const page = await browser.newPage({ viewport: { width: 1700, height: 900 } }); page.on("pageerror", (e) => errors.push(e.message));
await page.route("https://demo.frontendmentorsolutions.io/inspector.js", (r) => r.fulfill({ path: LOCAL, contentType: "text/javascript" }));
await page.goto(`http://127.0.0.1:${srv.address().port}/`, { waitUntil: "networkidle" });
const host = page.locator("fm-inspector");
const untick = (sel, prop) => page.evaluate(([s, p]) => { const sh = document.querySelector("fm-inspector").shadowRoot; const g = [...sh.querySelectorAll("#view-css .grp")].find((g) => g.querySelector(".gh .sel").textContent.trim() === s); [...g.querySelectorAll(".d")].find((d) => d.querySelector(".t").textContent.trim() === p + ":").querySelector("input").click(); }, [sel, prop]);
const dragOn = async (sel, dx) => { await page.evaluate((s) => document.querySelector("fm-inspector").chooseSize(document.querySelector(s)), sel); await page.waitForTimeout(200); const b = await host.locator(".hd").boundingBox(); const x = b.x + b.width / 2, y = b.y + b.height / 2; await page.mouse.move(x, y); await page.mouse.down(); for (let i = 1; i <= 6; i++) await page.mouse.move(x + dx * i / 6, y); await page.mouse.up(); await page.waitForTimeout(400); };
const st = () => page.evaluate(() => { const sh = document.querySelector("fm-inspector").shadowRoot; const i = document.querySelector("fm-inspector"); const box = sh.querySelector(".dbox"), chip = sh.querySelector(".lb.hold"); const same = (el) => { if (!box || !el) return false; const a = box.getBoundingClientRect(), b = el.getBoundingClientRect(); return Math.abs(a.left - b.left) < 1 && Math.abs(a.width - b.width) < 1; }; const w = sh.querySelector(".wblock"); return { sr: [...w.childNodes].filter((n) => !n.classList?.contains("wgo")).map((n) => n.textContent).join("").trim(), redRow: sh.querySelector(".d.block")?.textContent.trim() || null, frame: !!box, chip: chip?.textContent || null, frameOnMain: same(document.querySelector("main")), frameOnCard: same(document.querySelector("main div")), frameOnBody: same(document.body) }; });
await openBox(page, host, "css"); await host.locator(".sizebtn").click(); await page.waitForTimeout(150);
await dragOn("p", 200); console.log("own max:", JSON.stringify(await st()), "(expect redRow 256px, NO frame, no chip)");
await untick("p", "max-inline-size"); await page.waitForTimeout(300);
await dragOn("p", 200); console.log("p past the card (card max 320 is the parent's rule):", JSON.stringify(await st()), "(expect redRow 320px AND the card framed with chip 'div: max-inline-size: 320px')");
await untick("div", "max-inline-size"); await page.evaluate(() => document.querySelector("fm-inspector").sizeResetAll()); await page.waitForTimeout(300); // p back from 100%: with it cyclic, main would just grow with the card
await dragOn("main div", 300); console.log("card 300 wider inside the content-sized main:", JSON.stringify(await st()), "(since v0.1.79 main hugs its content and grows with the card: no hold, no frame)");
await dragOn("main div", 1200); console.log("card dragged past the body's box:", JSON.stringify(await st()), "(expect frame on main, chip 'body grid: place-items: center', redRow place-items: main cannot grow past its grid area)");
await dragOn("main div", -1200);
await untick("body", "place-items"); await page.waitForTimeout(300);
await dragOn("main div", 300); console.log("card, main with no rule at all:", JSON.stringify(await st()), "(no hold expected: with place-items off the grid item stretches, main spans the body)");
await dragOn("main div", -500); console.log("narrowed back inside:", JSON.stringify(await st()), "(expect no frame, no chip)");
await page.keyboard.press("Escape"); await page.waitForTimeout(300); console.log("tool off:", JSON.stringify(await st()));
console.log("errors:", JSON.stringify(errors));
await browser.close(); srv.close();
