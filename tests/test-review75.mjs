// (v0.2: the box opens through the rail's lenses, the resize tool's box on the choice; the hold's words read without the door) The v0.1.75 outside review's findings as observational checks: the caret glyph, the size tool's ownership (a page re-size after the tool's write
// is not undone by the handle's Reset, Reset sizes or undo; a writing-mode flip does not redirect a step), Reset keeping the page's additions on a
// rule it rebuilt, the CSS undo's priority snapshot, a duplicate declaration keeping its identity across a reconcile, and the ignore mark flipping.
import { chromium } from "playwright";
import { openBox } from "./lib/browser.mjs";
import http from "node:http";
const LOCAL = process.env.INSPECTOR || new URL("../inspector.js", import.meta.url).pathname;
const html = `<!doctype html><html><head><meta charset="utf-8"><title>review75</title>
<style id="s">
  * { box-sizing: border-box; }
  body { margin: 0; padding: 40px; }
  main { width: 600px; }
  .box { width: 100px; height: 40px; background: #ddd; }
  .card { color: red; padding: 10px; }
  .dup { color: red; color: blue; }
</style></head><body><main>
  <div class="box" id="box"></div>
  <p class="card" id="card">card</p>
  <p class="dup" id="dup">dup</p>
  <p id="inl" style="margin: 3px">inline</p>
</main><script defer src="https://demo.frontendmentorsolutions.io/inspector.js"></script></body></html>`;
const srv = http.createServer((q, r) => { r.setHeader("content-type", "text/html"); r.end(html); }).listen(0);
const browser = await chromium.launch();
const errors = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("console", (m) => { if (m.type() === "error" && !/favicon/.test(m.text())) errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(e.message));
await page.route("https://demo.frontendmentorsolutions.io/inspector.js", (r) => r.fulfill({ path: LOCAL, contentType: "text/javascript" }));
await page.goto(`http://127.0.0.1:${srv.address().port}/`, { waitUntil: "networkidle" });
const host = page.locator("fm-inspector");
const sr = (fn, arg) => page.evaluate(fn, arg);
const I = "document.querySelector('fm-inspector')";
await openBox(page, host, "html");
console.log("version:", await sr(() => document.querySelector("fm-inspector").dataset.version));

// 1. the fold caret is a glyph, not an escape sequence
console.log("1 caret ::before content:", await sr(() => { const c = document.querySelector("fm-inspector").shadowRoot.querySelector(".caret"); return c ? getComputedStyle(c, "::before").content : "(no caret)"; }));

// 2. the handle's Reset after the page re-sized the element: the page's size stands
const boxStyle = () => sr(() => document.getElementById("box").getAttribute("style"));
const note = () => sr(() => { const w = document.querySelector("fm-inspector").shadowRoot.querySelector(".wblock"); return w ? [...w.childNodes].filter((n) => !n.classList?.contains("wgo")).map((n) => n.textContent).join("").trim() : null; });
await host.locator(".sizebtn").click(); await page.waitForTimeout(200);
await sr(() => { const i = document.querySelector("fm-inspector"), el = document.getElementById("box"); i.chooseSize(el); const s = i.resizeStart(el); i.resizeWidth(s, 140); i.finishResize(s, false); });
console.log("2 after the tool's 140px:", JSON.stringify(await boxStyle()));
await sr(() => { document.getElementById("box").style.inlineSize = "175px"; }); await page.waitForTimeout(300);
await sr(() => document.querySelector("fm-inspector").sizeReset(document.getElementById("box")));
console.log("2 handle Reset after the page wrote 175px:", JSON.stringify(await boxStyle()), "note:", JSON.stringify(await note()), "(expect 175px kept)");
await sr(() => { document.getElementById("box").removeAttribute("style"); });

// 3. the page re-sizes between the tool's last move and the release: the step's undo skips it
await sr(() => { const i = document.querySelector("fm-inspector"), el = document.getElementById("box"); i.chooseSize(el); const s = i.resizeStart(el); i.resizeWidth(s, 140); el.style.inlineSize = "175px"; i.finishResize(s, false); });
await sr(() => document.querySelector("fm-inspector").sizeUndo());
console.log("3 undo after a page write before the release:", JSON.stringify(await boxStyle()), "note:", JSON.stringify(await note()), "(expect 175px kept)");
await sr(() => { document.getElementById("box").removeAttribute("style"); });

// 4. Reset sizes after the page re-sized one of two resized elements: that one stays, the other goes back
await sr(() => { const i = document.querySelector("fm-inspector"); for (const id of ["box", "card"]) { const el = document.getElementById(id); i.chooseSize(el); const s = i.resizeStart(el); i.resizeWidth(s, 140); i.finishResize(s, false); } });
await sr(() => { document.getElementById("box").style.inlineSize = "175px"; }); await page.waitForTimeout(300);
await sr(() => document.querySelector("fm-inspector").sizeResetAll());
console.log("4 Reset sizes: box", JSON.stringify(await boxStyle()), "card", JSON.stringify(await sr(() => document.getElementById("card").getAttribute("style"))), "note:", JSON.stringify(await note()), "(expect box 175px, card none)");
await sr(() => { document.getElementById("box").removeAttribute("style"); });

// 5. a writing-mode flip after the resize: undo puts the property it wrote back, not today's
await sr(() => { const i = document.querySelector("fm-inspector"), el = document.getElementById("box"); i.chooseSize(el); const s = i.resizeStart(el); i.resizeWidth(s, 140); i.finishResize(s, false); });
await sr(() => { document.getElementById("box").style.writingMode = "vertical-rl"; }); await page.waitForTimeout(300);
await sr(() => document.querySelector("fm-inspector").sizeUndo());
console.log("5 undo after a writing-mode flip:", JSON.stringify(await boxStyle()), "(expect inline-size gone, no block-size, writing-mode kept)");
await sr(() => { document.getElementById("box").removeAttribute("style"); });
await host.locator(".sizebtn").click(); await page.waitForTimeout(200);

// 6. Reset on a rule the page added to since the edit, then another edit: the page's addition stays
await openBox(page, host, "css");
const cardCss = () => sr(() => { const r = [...document.getElementById("s").sheet.cssRules].find((r) => r.selectorText === ".card"); return r.style.cssText; });
const edit = (sel, prop, value) => sr(([sel, prop, value]) => {
  const i = document.querySelector("fm-inspector");
  const d = i.store.allDecls.find((d) => d.model.selector === sel && d.prop === prop && d.on);
  const before = i.state(d); d.value = value; i.apply(d); i.record([{ d, before, after: i.state(d) }]); return d.value;
}, [sel, prop, value]);
await edit(".card", "color", "blue");
await sr(() => { const r = [...document.getElementById("s").sheet.cssRules].find((r) => r.selectorText === ".card"); r.style.setProperty("background", "yellow"); document.querySelector("fm-inspector").reset(); });
await page.waitForTimeout(1300);
console.log("6 after page background + Reset:", JSON.stringify(await cardCss()));
await edit(".card", "color", "green"); await page.waitForTimeout(300);
console.log("6 after the next color edit:", JSON.stringify(await cardCss()), "(expect background: yellow kept)");
await sr(() => document.querySelector("fm-inspector").reset()); await page.waitForTimeout(1300);
// the same with the poll having reconciled the page's addition before Reset
await edit(".card", "color", "blue");
await sr(() => { const r = [...document.getElementById("s").sheet.cssRules].find((r) => r.selectorText === ".card"); r.style.setProperty("border", "1px solid"); }); await page.waitForTimeout(1300);
await sr(() => document.querySelector("fm-inspector").reset()); await page.waitForTimeout(1300);
await edit(".card", "color", "green"); await page.waitForTimeout(300);
console.log("6b polled addition, Reset, next edit:", JSON.stringify(await cardCss()), "(expect border kept)");
await sr(() => document.querySelector("fm-inspector").reset()); await page.waitForTimeout(1300);

// 7. the undo snapshot: the page raised the edited value to !important and the model refreshed; undo leaves the page's write
await edit(".card", "color", "blue");
await sr(() => { const r = [...document.getElementById("s").sheet.cssRules].find((r) => r.selectorText === ".card"); r.style.setProperty("color", "blue", "important"); }); await page.waitForTimeout(1300);
await sr(() => document.querySelector("fm-inspector").undo()); await page.waitForTimeout(300);
console.log("7 undo after the page made it !important:", JSON.stringify(await cardCss()), "(expect color: blue !important kept)");
await sr(() => document.querySelector("fm-inspector").reset()); await page.waitForTimeout(1300);

// 8. a duplicate's identity across a reconcile: edit the second color, the page adds a property, undo brings the second's value back
const dupCss = () => sr(() => [...document.getElementById("s").sheet.cssRules].find((r) => r.selectorText === ".dup").style.cssText);
const dupRows = () => sr(() => document.querySelector("fm-inspector").store.allDecls.filter((d) => d.model.selector === ".dup").map((d) => `${d.prop}: ${d.value}${d.on ? "" : " (off)"}`));
console.log("8 dup rows at start:", JSON.stringify(await dupRows()));
await sr(() => { const i = document.querySelector("fm-inspector"); const ds = i.store.allDecls.filter((d) => d.model.selector === ".dup" && d.prop === "color"); const d = ds[ds.length - 1]; const before = i.state(d); d.value = "green"; i.apply(d); i.record([{ d, before, after: i.state(d) }]); });
console.log("8 after editing the second color:", JSON.stringify(await dupCss()));
await sr(() => { [...document.getElementById("s").sheet.cssRules].find((r) => r.selectorText === ".dup").style.setProperty("background", "pink"); }); await page.waitForTimeout(1300);
console.log("8 rows after the page's addition:", JSON.stringify(await dupRows()));
await sr(() => document.querySelector("fm-inspector").undo()); await page.waitForTimeout(300);
console.log("8 after undo:", JSON.stringify(await dupCss()), "(expect color: blue, background: pink)");
await sr(() => document.querySelector("fm-inspector").reset()); await page.waitForTimeout(1300);

// 9. the ignore mark set on a picked, resized element: the pick, the size target and its inline group leave; removed again, it is back in the HTML rows
await openBox(page, host, "html");
await sr(() => { const i = document.querySelector("fm-inspector"), el = document.getElementById("inl"); i.pick(el, i.rows.get(el)); i.chooseSize(el); });
const state = () => sr(() => { const i = document.querySelector("fm-inspector"); return { picks: i.picks.size, sizeTarget: i.sizeTarget?.id || null, htmlRow: i.rows.has(document.getElementById("inl")), inlineGroup: i.store.inlineNodes.some((n) => n.inlineEl?.id === "inl" || n.el?.id === "inl" || n.model?.inlineEl?.id === "inl") }; });
console.log("9 picked + chosen:", JSON.stringify(await state()));
await sr(() => document.getElementById("inl").setAttribute("data-fm-inspector-ignore", "")); await page.waitForTimeout(700);
console.log("9 mark set:", JSON.stringify(await state()), "(expect picks 0, no size target, no HTML row, no inline group)");
await sr(() => document.getElementById("inl").removeAttribute("data-fm-inspector-ignore")); await page.waitForTimeout(700);
console.log("9 mark removed:", JSON.stringify(await state()), "(expect the HTML row and inline group back)");

// 10. (the v0.1.79 review) a page write after the drag's last move, then a cancel: the page's size stands
await host.locator(".sizebtn").click(); await page.waitForTimeout(200);
await sr(() => { document.getElementById("box").removeAttribute("style"); const i = document.querySelector("fm-inspector"), el = document.getElementById("box"); i.chooseSize(el); const s = i.resizeStart(el); i.resizeWidth(s, 140); el.style.setProperty("inline-size", "175px", "important"); i.finishResize(s, true); });
console.log("10 cancel after a page write:", JSON.stringify(await boxStyle()), "(expect 175px !important kept)");
await sr(() => { document.getElementById("box").removeAttribute("style"); });
// 11. a page write between two moves, then a cancel and, in a second session, an undo: both return to the page's write, not the drag's start
await sr(() => { const i = document.querySelector("fm-inspector"), el = document.getElementById("box"); i.chooseSize(el); const s = i.resizeStart(el); i.resizeWidth(s, 140); el.style.setProperty("inline-size", "175px", "important"); i.resizeWidth(s, 160); window.__mid = el.getAttribute("style"); i.finishResize(s, true); });
console.log("11 interleaved page write, cancel: mid-drag", JSON.stringify(await sr(() => window.__mid)), "after", JSON.stringify(await boxStyle()), "(expect 175px !important)");
await sr(() => { document.getElementById("box").removeAttribute("style"); });
await sr(() => { const i = document.querySelector("fm-inspector"), el = document.getElementById("box"); i.chooseSize(el); const s = i.resizeStart(el); i.resizeWidth(s, 140); el.style.setProperty("inline-size", "175px", "important"); i.resizeWidth(s, 160); i.finishResize(s, false); });
await sr(() => document.querySelector("fm-inspector").sizeUndo());
console.log("11 interleaved page write, finish then undo:", JSON.stringify(await boxStyle()), "note:", JSON.stringify(await note()), "(expect 175px !important)");
await sr(() => { document.getElementById("box").removeAttribute("style"); });
await host.locator(".sizebtn").click(); await page.waitForTimeout(200);
// 12. a duplicate chain with an important first line: untick the red, the page adds a property, Reset, untick the red again: the blue fallback stands
await openBox(page, host, "css");
await sr(() => { document.getElementById("s").textContent += "\n#dup2 { color: red !important; color: blue; }"; const el = document.createElement("p"); el.id = "dup2"; el.textContent = "dup2"; document.querySelector("main").append(el); }); await page.waitForTimeout(1300);
const dup2 = () => sr(() => [...document.getElementById("s").sheet.cssRules].find((r) => r.selectorText === "#dup2")?.style.cssText);
const dup2Rows = () => sr(() => document.querySelector("fm-inspector").store.allDecls.filter((d) => d.model.selector === "#dup2").map((d) => `${d.prop}: ${d.value}${d.important ? " !important" : ""}${d.on ? "" : " (off)"}`));
const untickRed = () => sr(() => { const i = document.querySelector("fm-inspector"); const d = i.store.allDecls.find((d) => d.model.selector === "#dup2" && d.prop === "color" && d.important); const before = i.state(d); d.on = false; i.apply(d); i.record([{ d, before, after: i.state(d) }]); });
console.log("12 rows at start:", JSON.stringify(await dup2Rows()), "live", JSON.stringify(await dup2()));
await untickRed(); console.log("12 red off:", JSON.stringify(await dup2()));
await sr(() => { [...document.getElementById("s").sheet.cssRules].find((r) => r.selectorText === "#dup2").style.setProperty("background", "yellow"); }); await page.waitForTimeout(1300);
await sr(() => document.querySelector("fm-inspector").reset()); await page.waitForTimeout(1300);
console.log("12 after page background + Reset: rows", JSON.stringify(await dup2Rows()), "live", JSON.stringify(await dup2()));
await untickRed(); console.log("12 red off again:", JSON.stringify(await dup2()), "(expect color: blue; background: yellow)");

// 13. (the v0.1.81 review) a three-line chain, the page adds a property, an unrelated edit: the chain keeps its order and blue still wins
const addRule = async (id, css) => { await sr(([id, css]) => { document.getElementById("s").textContent += `\n#${id} { ${css} }`; const el = document.createElement("p"); el.id = id; el.textContent = id; document.querySelector("main").append(el); }, [id, css]); await page.waitForTimeout(1300); };
const ruleOf = (id) => sr((id) => [...document.getElementById("s").sheet.cssRules].find((r) => r.selectorText === `#${id}`)?.style.cssText, id);
const rowsOf = (id) => sr((id) => document.querySelector("fm-inspector").store.models.find((m) => m.selector === `#${id}`)?.decls.filter((d) => d.type === "decl").map((d) => `${d.prop}: ${d.value}${d.important ? " !important" : ""}${d.on ? "" : " (off)"}`), id);
const editProp = (id, prop, value) => sr(([id, prop, value]) => { const i = document.querySelector("fm-inspector"); const d = i.store.models.find((m) => m.selector === `#${id}`).decls.find((d) => d.type === "decl" && d.prop === prop && d.on); const before = i.state(d); d.value = value; i.apply(d); i.record([{ d, before, after: i.state(d) }]); }, [id, prop, value]);
await addRule("chain3", "color: red; color: green; color: blue; padding: 2px;");
await sr(() => { [...document.getElementById("s").sheet.cssRules].find((r) => r.selectorText === "#chain3").style.setProperty("background", "yellow"); }); await page.waitForTimeout(1300);
console.log("13 three-line chain after the page's addition: rows", JSON.stringify(await rowsOf("chain3")));
await editProp("chain3", "padding", "8px"); await page.waitForTimeout(200);
console.log("13 unrelated padding edit:", JSON.stringify(await ruleOf("chain3")), "(expect color: blue kept, padding 8px, background yellow)");
// 14. the page replaces an important line with a normal value; an unrelated edit must not bring the important back
await addRule("prio", "color: red !important; color: blue; padding: 2px;");
await sr(() => { [...document.getElementById("s").sheet.cssRules].find((r) => r.selectorText === "#prio").style.setProperty("color", "green"); }); await page.waitForTimeout(1300);
console.log("14 page set color: green (normal) over the important: live", JSON.stringify(await ruleOf("prio")), "rows", JSON.stringify(await rowsOf("prio")));
await editProp("prio", "padding", "8px"); await page.waitForTimeout(200);
console.log("14 unrelated padding edit:", JSON.stringify(await ruleOf("prio")), "(expect color: green normal kept)");
await sr(() => document.querySelector("fm-inspector").reset()); await page.waitForTimeout(1300);
console.log("14 Reset:", JSON.stringify(await ruleOf("prio")), "rows", JSON.stringify(await rowsOf("prio")), "(expect the page's green, the red line off)");
// 15. a page write between two moves, then the handle's Reset, Reset sizes, and undo then Reset: each returns to the page's write
await openBox(page, host, "html"); await host.locator(".sizebtn").click(); await page.waitForTimeout(200);
const interleave = () => sr(() => { document.getElementById("box").removeAttribute("style"); const i = document.querySelector("fm-inspector"), el = document.getElementById("box"); i.chooseSize(el); const s = i.resizeStart(el); i.resizeWidth(s, 140); el.style.setProperty("inline-size", "175px", "important"); i.resizeWidth(s, 160); i.finishResize(s, false); });
await interleave(); await sr(() => document.querySelector("fm-inspector").sizeReset(document.getElementById("box")));
console.log("15 interleaved, handle Reset:", JSON.stringify(await boxStyle()), "(expect 175px !important)");
await interleave(); await sr(() => document.querySelector("fm-inspector").sizeResetAll());
console.log("15 interleaved, Reset sizes:", JSON.stringify(await boxStyle()), "(expect 175px !important)");
await interleave(); await sr(() => { const i = document.querySelector("fm-inspector"); i.sizeUndo(); i.sizeReset(document.getElementById("box")); });
console.log("15 interleaved, undo then Reset:", JSON.stringify(await boxStyle()), "(expect 175px !important)");
await sr(() => { document.getElementById("box").removeAttribute("style"); });

console.log("errors:", errors.length, errors.slice(0, 3));
await browser.close(); srv.close();
