// Copyright 2026 Alper Donmez. All rights reserved.
// inspector.js v0.1.0

(() => {
  if (customElements.get("fm-inspector")) return;

  const STYLE = `
    :host {
      --bg: light-dark(#ffffff, #15181e);
      --bg-2: light-dark(#f7f7f8, #0c0e12);
      --border: light-dark(#e3e4e8, #262a33);
      --text: light-dark(#14161b, #e8e9ec);
      --muted: light-dark(#5d6170, #9aa0ad);
      --accent: light-dark(#2c5fd8, #7aa2ff);
      --wash: color-mix(in srgb, var(--accent) 14%, transparent);
      /* one hue per picked element, cycling; green and orange stay the padding/margin bands */
      --pick-0: light-dark(#2c5fd8, #7aa2ff);
      --pick-1: light-dark(#c0268f, #ff7ad1);
      --pick-2: light-dark(#0e8a7d, #5fe0d0);
      --pick-3: light-dark(#6b3fd6, #b69cff);
      --pick-4: light-dark(#c8323c, #ff8a90);
      --pick-5: light-dark(#4a5568, #b0b8c8);
      --pad: rgba(106, 196, 128, 0.45);
      --pad-ink: light-dark(#1d6b36, #9be3b0);
      --mar: rgba(246, 178, 107, 0.45);
      --mar-ink: light-dark(#8a4b00, #ffd29a);
      --font: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
      --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      --shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
      color-scheme: light dark;
      position: fixed;
      inset-block-start: auto;
      inset-inline-start: auto;
      inset-block-end: 16px;
      inset-inline-end: 16px;
      z-index: 2147483000;
      display: block;
      font-family: var(--font);
      font-size: 14px;
      line-height: 1.5;
      color: var(--text);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; touch-action: manipulation; }
    button:focus-visible, input:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

    .fab {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-block-size: 44px;
      padding: 0 16px;
      font-weight: 600;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 999px;
      box-shadow: var(--shadow);
      touch-action: none;
      user-select: none;
    }
    .fab:hover { color: var(--accent); }
    .fab svg { inline-size: 16px; block-size: 16px; }
    :host([open]) .fab { display: none; }
    /* the pill's dismiss badge: shows on hover, removes the inspector until the next page load */
    .bye {
      position: absolute;
      inset-block-start: -6px;
      inset-inline-end: -6px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      inline-size: 22px;
      block-size: 22px;
      color: var(--muted);
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 999px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
      opacity: 0;
      transition: opacity 120ms;
    }
    .bye svg { inline-size: 12px; block-size: 12px; }
    .bye:hover { color: var(--text); background: var(--bg-2); }
    :host(:hover) .bye, .bye:focus-visible { opacity: 1; }
    :host([open]) .bye, :host([dragging]) .bye { display: none; }
    @media (hover: none) { .bye { opacity: 1; inline-size: 26px; block-size: 26px; } }

    .panel {
      position: relative; /* paints over the overlay */
      display: none;
      flex-direction: column;
      inline-size: min(28rem, calc(100vw - 16px));
      max-block-size: min(70vh, 44rem);
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      box-shadow: var(--shadow);
      overflow: hidden;
    }
    :host([open]) .panel { display: flex; }

    .head {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px 0;
      border-block-end: 1px solid var(--border);
      cursor: grab;
      touch-action: none;
      user-select: none;
    }
    :host([dragging]) .head, :host([dragging]) .fab { cursor: grabbing; }
    /* folded: only the head stands, in place */
    :host([folded]) .body, :host([folded]) .rz { display: none; }
    :host([folded]) .panel { block-size: auto !important; }
    :host([folded]) .head { border-block-end: 0; }

    /* resize handles: thin strips along the panel's edges and squares on its corners, straddling the border */
    .rz { position: absolute; display: none; touch-action: none; z-index: 1; }
    :host([open]) .rz { display: block; }
    .rz.n, .rz.s { inset-inline: 10px; block-size: 12px; cursor: ns-resize; }
    .rz.e, .rz.w { inset-block: 10px; inline-size: 12px; cursor: ew-resize; }
    .rz.n { inset-block-start: -6px; }
    .rz.s { inset-block-end: -6px; }
    .rz.e { inset-inline-end: -6px; }
    .rz.w { inset-inline-start: -6px; }
    .rz.ne, .rz.nw, .rz.se, .rz.sw { inline-size: 18px; block-size: 18px; }
    .rz.ne { inset-block-start: -7px; inset-inline-end: -7px; cursor: nesw-resize; }
    .rz.sw { inset-block-end: -7px; inset-inline-start: -7px; cursor: nesw-resize; }
    .rz.nw { inset-block-start: -7px; inset-inline-start: -7px; cursor: nwse-resize; }
    .rz.se { inset-block-end: -7px; inset-inline-end: -7px; cursor: nwse-resize; }
    :host([resizing]) * { user-select: none; }

    .tab {
      min-block-size: 24px;
      padding: 0 10px;
      font-size: 12px;
      font-weight: 600;
      color: var(--muted);
      border-block-end: 2px solid transparent;
      margin-block-end: -1px;
    }
    .tab:hover { color: var(--text); }
    .tab[aria-selected="true"] { color: var(--accent); border-color: var(--accent); }
    .spacer { flex: 1; }
    .reset, .undo, .close {
      min-inline-size: 28px;
      min-block-size: 24px;
      padding: 0 8px;
      color: var(--muted);
      border-radius: 8px;
    }
    .reset { font-size: 12px; }
    .reset:hover, .undo:hover, .close:hover { color: var(--text); background: var(--bg-2); }
    .undo:disabled { opacity: 0.35; cursor: default; background: none; }
    .undo svg, .close svg { inline-size: 14px; block-size: 14px; }

    .body { overflow: auto; padding: 12px 16px 16px; }
    pre {
      font-family: var(--mono);
      font-size: 13px;
      line-height: 1.7;
      tab-size: 2;
      white-space: pre;
    }
    [hidden] { display: none !important; }

    /* HTML rows: one button per element, the closing tag a plain line that lights with it */
    .el, .cl {
      display: inline-block;
      padding: 0 3px;
      margin: 0 -3px;
      border-radius: 4px;
      white-space: pre;
    }
    .el:hover { background: var(--bg-2); }
    .el[aria-pressed="true"], .cl.on { background: var(--wash); }
    .el:disabled { cursor: default; opacity: 0.5; }
    .el:disabled:hover { background: none; }
    .an { color: var(--muted); }

    /* CSS rows: the tick removes the declaration, the text shows where it lands */
    .d {
      display: inline-flex;
      align-items: center;
      border-radius: 4px;
      padding-inline-end: 4px;
    }
    .d:hover { background: var(--bg-2); }
    .d input[type="checkbox"] {
      inline-size: 14px;
      block-size: 14px;
      margin: 0 8px 0 0;
      accent-color: var(--accent);
      cursor: pointer;
      flex: none;
    }
    .d .t { text-align: start; white-space: pre; border-radius: 4px; }
    .d .t[aria-pressed="true"] { color: var(--accent); font-weight: 600; }
    .d.on { background: var(--wash); }
    .d .v { cursor: text; border-block-end: 1px dotted var(--muted); }
    .d .v:hover { color: var(--accent); border-color: var(--accent); }
    .d.edited .v { color: var(--accent); font-weight: 600; }
    .d .ed {
      font: inherit;
      line-height: 1.3;
      color: var(--accent);
      background: var(--bg-2);
      border: 1px solid var(--accent);
      border-radius: 4px;
      padding: 1px 6px;
      margin: -2px 0;
      min-inline-size: 5ch;
      box-shadow: 0 0 0 3px var(--wash);
    }
    .d .ed:focus { outline: none; }
    .d .ed[aria-invalid="true"] { border-color: #d64545; color: #d64545; }
    .d input:not(:checked) ~ .t, .d input:not(:checked) ~ .v, .d input:not(:checked) ~ .x { text-decoration: line-through; opacity: 0.45; }
    .d.na { opacity: 0.5; }
    .d.na .t { cursor: default; }
    .d.na:hover { background: none; }
    .c { color: var(--muted); }
    .sel { color: var(--accent); }

    /* the overlay: fixed boxes painted over the page's elements */
    .ov { pointer-events: none; font-family: var(--mono); font-size: 12px; line-height: 1; }
    .ov div { position: fixed; }
    .ov .pick { position: static; }
    .box { border: 1px solid var(--accent); }
    .ct { background: var(--wash); }
    .pd, .mr { border-style: solid; border-color: var(--pad); }
    .mr { border-color: var(--mar); }
    .lb {
      padding: 4px 6px;
      border-radius: 4px;
      background: var(--accent);
      color: var(--bg);
      font-weight: 600;
      white-space: nowrap;
      transform: translate(-50%, -50%);
    }
    .lb.tag { transform: translate(0, -100%); margin-block-start: -4px; }
    .lb.tag[data-in] { transform: none; margin: 4px 0 0 4px; }
    .lb.pv { background: var(--pad-ink); color: #fff; padding: 2px 4px; font-size: 10px; }
    .lb.mv { background: var(--mar-ink); color: #fff; padding: 2px 4px; font-size: 10px; }
    .ln { background: var(--accent); }
    .ln::before, .ln::after { content: ""; position: absolute; background: var(--accent); }
    .w { block-size: 1px; }
    .w::before, .w::after { inline-size: 1px; block-size: 9px; inset-block-start: -4px; }
    .w::before { inset-inline-start: 0; }
    .w::after { inset-inline-end: 0; }
    .h { inline-size: 1px; }
    .h::before, .h::after { block-size: 1px; inline-size: 9px; inset-inline-start: -4px; }
    .h::before { inset-block-start: 0; }
    .h::after { inset-block-end: 0; }

    @media (max-width: 480px) {
      /* phones: a tighter, smaller-type panel */
      :host { inset-block-end: 8px; inset-inline-end: 8px; font-size: 12px; }
      .fab { min-block-size: 36px; padding: 0 12px; font-size: 12px; gap: 6px; }
      .fab svg { inline-size: 13px; block-size: 13px; }
      .panel { inline-size: calc(100vw - 16px); max-block-size: 40vh; }
      .head { padding: 1px 2px 0; }
      .tab { min-block-size: 20px; padding: 0 8px; font-size: 11px; }
      .reset, .undo, .close { min-block-size: 20px; min-inline-size: 24px; }
      .reset { font-size: 11px; }
      .undo svg, .close svg { inline-size: 12px; block-size: 12px; }
      .body { padding: 6px 10px 10px; }
      pre { font-size: 11px; }
    }
    @media (pointer: coarse) {
      pre { line-height: 1.9; } /* taller rows: finger-sized targets */
      .d input[type="checkbox"] { inline-size: 18px; block-size: 18px; }
    }
    @media (prefers-reduced-motion: no-preference) {
      .panel { animation: rise 160ms ease-out; }
      @keyframes rise { from { opacity: 0; transform: translateY(8px); } }
    }
  `;

  const ICON_CODE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/></svg>';
  const ICON_UNDO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h10a6 6 0 0 1 0 12H4M4 7l4-4M4 7l4 4"/></svg>';
  const ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  const MARKUP = `
    <div class="ov" aria-hidden="true"></div>
    <button class="fab" type="button" aria-expanded="false" aria-controls="panel">${ICON_CODE}Show code</button>
    <button class="bye" type="button" aria-label="Remove the code inspector" title="Remove until the next page load">${ICON_X}</button>
    <section class="panel" id="panel" aria-label="Code">
      <div class="head">
        <div role="tablist" aria-label="Code views">
          <button class="tab" type="button" role="tab" id="tab-html" aria-selected="true" aria-controls="view-html">HTML</button>
          <button class="tab" type="button" role="tab" id="tab-css" aria-selected="false" aria-controls="view-css">CSS</button>
        </div>
        <span class="spacer"></span>
        <button class="undo" type="button" aria-label="Undo" title="Undo the last change" hidden disabled>${ICON_UNDO}</button>
        <button class="reset" type="button" hidden>Reset</button>
        <button class="close" type="button" aria-label="Hide code">${ICON_X}</button>
      </div>
      <div class="body">
        <pre id="view-html" role="tabpanel" aria-labelledby="tab-html"></pre>
        <pre id="view-css" role="tabpanel" aria-labelledby="tab-css" hidden></pre>
      </div>
    </section>
    ${["n", "s", "e", "w", "ne", "nw", "se", "sw"].map((e) => `<div class="rz ${e}" data-edge="${e}" aria-hidden="true"></div>`).join("")}`;

  /* ---------- helpers ---------- */

  const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  const skip = (n) =>
    (n.nodeType === 1 && (n.localName === "fm-inspector" || (n.localName === "script" && /inspector\.js/.test(n.getAttribute("src") || "")))) ||
    (n.nodeType === 8 && /inspector/i.test(n.data)) ||
    (n.nodeType === 3 && !n.data.trim());
  const squash = (s) => s.replace(/\s+/g, " ").trim();
  const rendered = (el) => el.getClientRects().length > 0 && !el.closest("fm-inspector");
  const num = (v) => parseFloat(v) || 0;
  const fmt = (n) => String(Math.round(n * 100) / 100);
  const camel = (p) => p.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  const name = (el) => el.localName + (el.id ? `#${el.id}` : "") + (el.classList.length ? "." + [...el.classList].join(".") : "");

  // Which sides a padding/margin property names: t r b l
  function sides(prop) {
    const m = prop.match(/^(padding|margin)(?:-(top|right|bottom|left|inline|block))?(?:-(start|end))?$/);
    if (!m) return null;
    const [, kind, part, half] = m;
    let s = { t: 1, r: 1, b: 1, l: 1 };
    if (part === "top") s = { t: 1 }; else if (part === "right") s = { r: 1 }; else if (part === "bottom") s = { b: 1 }; else if (part === "left") s = { l: 1 };
    else if (part === "inline") s = half === "start" ? { l: 1 } : half === "end" ? { r: 1 } : { l: 1, r: 1 };
    else if (part === "block") s = half === "start" ? { t: 1 } : half === "end" ? { b: 1 } : { t: 1, b: 1 };
    return { kind, sides: s };
  }
  const SIZE = /^(min-|max-)?(inline-size|block-size|width|height)$/;

  /* ---------- a small CSS reader: keeps comments and blank lines, maps rules onto the CSSOM ---------- */

  const CONDITIONAL = /^@(media|supports|layer|container|scope)\b/;

  function parseBlock(src, pos, end) {
    // Parses sibling rules/comments/blank lines between pos and end; returns [nodes, nextPos]
    const nodes = [];
    let i = pos;
    const ws = () => {
      let nl = 0;
      while (i < end && /\s/.test(src[i])) { if (src[i] === "\n") nl++; i++; }
      if (nl > 1 && nodes.length) nodes.push({ type: "blank" });
    };
    while (i < end) {
      ws();
      if (i >= end) break;
      if (src[i] === "}") { i++; break; }
      if (src.startsWith("/*", i)) {
        const close = src.indexOf("*/", i + 2);
        const stop = close === -1 ? end : close + 2;
        nodes.push({ type: "comment", text: src.slice(i, stop) });
        i = stop;
        continue;
      }
      const brace = scanTo(src, i, end, "{;");
      if (brace === -1 || brace >= end) { nodes.push({ type: "comment", text: src.slice(i, end).trim() }); i = end; break; }
      const head = src.slice(i, brace).trim();
      if (src[brace] === ";") { nodes.push({ type: "flat", text: head + ";" }); i = brace + 1; continue; }
      const blockEnd = matchBrace(src, brace, end);
      if (head.startsWith("@") && CONDITIONAL.test(head)) {
        const [children] = parseBlock(src, brace + 1, blockEnd);
        nodes.push({ type: "group", head, children });
      } else if (head.startsWith("@keyframes") || head.startsWith("@-webkit-keyframes")) {
        nodes.push({ type: "opaque", head, text: src.slice(brace + 1, blockEnd) });
      } else {
        nodes.push({ type: "rule", head, decls: parseDecls(src, brace + 1, blockEnd) });
      }
      i = blockEnd + 1;
    }
    return [nodes, i];
  }

  function scanTo(src, i, end, stops) {
    // Index of the first stop char outside strings, parens and comments
    let depth = 0, q = null;
    for (; i < end; i++) {
      const ch = src[i];
      if (q) { if (ch === "\\") i++; else if (ch === q) q = null; continue; }
      if (ch === '"' || ch === "'") { q = ch; continue; }
      if (src.startsWith("/*", i)) { const c = src.indexOf("*/", i + 2); i = c === -1 ? end : c + 1; continue; }
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
      else if (depth === 0 && stops.includes(ch)) return i;
    }
    return -1;
  }

  function matchBrace(src, open, end) {
    let depth = 0, q = null;
    for (let i = open; i < end; i++) {
      const ch = src[i];
      if (q) { if (ch === "\\") i++; else if (ch === q) q = null; continue; }
      if (ch === '"' || ch === "'") { q = ch; continue; }
      if (src.startsWith("/*", i)) { const c = src.indexOf("*/", i + 2); i = c === -1 ? end : c + 1; continue; }
      if (ch === "{") depth++;
      else if (ch === "}" && --depth === 0) return i;
    }
    return end;
  }

  function parseDecls(src, pos, end) {
    const items = [];
    let i = pos, lastLine = -1;
    const lineOf = (at) => src.slice(0, at).split("\n").length;
    while (i < end) {
      let nl = 0;
      while (i < end && /\s/.test(src[i])) { if (src[i] === "\n") nl++; i++; }
      if (i >= end) break;
      if (nl > 1 && items.length) items.push({ type: "blank" });
      if (src.startsWith("/*", i)) {
        const close = src.indexOf("*/", i + 2);
        const stop = close === -1 ? end : close + 2;
        const text = src.slice(i, stop);
        const last = items[items.length - 1];
        if (last && last.type === "decl" && lineOf(i) === lastLine) last.tail = " " + text;
        else items.push({ type: "comment", text });
        i = stop;
        continue;
      }
      const stop = scanTo(src, i, end, ";");
      const raw = src.slice(i, stop === -1 ? end : stop).trim();
      i = stop === -1 ? end : stop + 1;
      lastLine = lineOf(i - 1);
      const colon = raw.indexOf(":");
      if (colon === -1 || !raw) { if (raw) items.push({ type: "comment", text: raw }); continue; }
      const prop = raw.slice(0, colon).trim();
      let value = raw.slice(colon + 1).trim();
      const important = /!important$/i.test(value);
      if (important) value = value.replace(/\s*!important$/i, "");
      items.push({ type: "decl", prop, value, important });
    }
    return items;
  }

  function link(nodes, cssRules) {
    // Pairs each parsed rule with its CSSOM rule in order; a mismatch leaves the rule display-only
    let k = 0;
    for (const n of nodes) {
      if (n.type !== "rule" && n.type !== "group" && n.type !== "opaque" && n.type !== "flat") continue;
      const r = cssRules[k++];
      if (!r) continue;
      if (n.type === "rule" && r.style && same(r.selectorText || r.cssText.split("{")[0], n.head)) n.rule = r;
      else if (n.type === "group" && r.cssRules) link(n.children, r.cssRules);
    }
  }
  const same = (a, b) => norm(a) === norm(b);
  const norm = (s) => s.replace(/\s+|["']/g, "").toLowerCase();

  /* ---------- the element ---------- */

  class Inspector extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot) return;
      const root = this.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = STYLE;
      root.append(style);
      const tpl = document.createElement("template");
      tpl.innerHTML = MARKUP;
      root.append(tpl.content);
      const $ = (s) => root.querySelector(s);
      this.fab = $(".fab");
      this.byeBtn = $(".bye");
      this.panel = $(".panel");
      this.head = $(".head");
      this.closeBtn = $(".close");
      this.resetBtn = $(".reset");
      this.undoBtn = $(".undo");
      this.history = []; // CSS changes, newest last: ticks, value edits and resets
      this.ov = $(".ov");
      this.tabs = [...root.querySelectorAll('[role="tab"]')];
      this.views = { html: $("#view-html"), css: $("#view-css") };
      this.decls = [];
      this.picks = new Map(); // element -> { row, hue } (hue = palette slot, the lowest one free at pick time)
      this.pins = new Set(); // pinned CSS declarations
      this.hover = null; // the CSS declaration under the pointer
      this.loaded = false;
      this.ro = new ResizeObserver(() => this.paint());
      this.watched = new Set(); // elements the overlay follows (observe() fires once on its own, so the set never churns)
      this.ro.observe(document.documentElement);
      this.onMove = () => this.paint();

      this.fab.addEventListener("click", () => this.toggle(true));
      this.closeBtn.addEventListener("click", () => this.toggle(false));
      this.byeBtn.addEventListener("click", () => this.dismiss());
      this.tabs.forEach((t) => t.addEventListener("click", () => { this.fold(false); this.show(t.id === "tab-css" ? "css" : "html"); }));
      // A click on the head's bare surface folds the panel down to the head, and back
      this.head.addEventListener("click", (e) => { if (!e.target.closest("button")) this.fold(!this.hasAttribute("folded")); });
      this.head.title = "Click to fold, drag to move";
      this.resetBtn.addEventListener("click", () => this.reset());
      this.undoBtn.addEventListener("click", () => this.undo());
      root.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && this.hasAttribute("open")) { e.preventDefault(); this.toggle(false); }
        if (e.target.getAttribute("role") === "tab" && (e.key === "ArrowLeft" || e.key === "ArrowRight")) {
          const i = this.tabs.indexOf(e.target);
          const next = this.tabs[(i + (e.key === "ArrowRight" ? 1 : this.tabs.length - 1)) % this.tabs.length];
          next.focus();
          next.click();
        }
      });
      // A drag that moved the box must not count as a click on what it started over
      root.addEventListener("click", (e) => { if (this.dragged) { e.stopPropagation(); e.preventDefault(); } }, true);
      this.draggable(this.head);
      this.draggable(this.fab);
      root.querySelectorAll(".rz").forEach((h) => this.resizable(h));
      this.onResize = () => { this.fit(); this.paint(); };
      addEventListener("resize", this.onResize);
      this.panelRo = new ResizeObserver(this.onResize);
      this.panelRo.observe(this.panel); // the panel grows as its views load
      addEventListener("scroll", this.onMove, { capture: true, passive: true });
      this.show("html");
    }

    /* ---------- floating box: drag, and shrink or grow where it stands ---------- */

    draggable(handle) {
      // Moves are read on the window: the pointer may leave the handle before the drag threshold is met
      let from = null, moved = false;
      const move = (e) => {
        const dx = e.clientX - from.x, dy = e.clientY - from.y;
        if (!moved && Math.hypot(dx, dy) < 4) return;
        moved = true;
        this.setAttribute("dragging", "");
        this.moveTo(from.right - dx, from.top + dy);
      };
      const end = () => {
        removeEventListener("pointermove", move);
        removeEventListener("pointerup", end);
        removeEventListener("pointercancel", end);
        from = null;
        this.removeAttribute("dragging");
        if (moved) { this.dragged = true; setTimeout(() => { this.dragged = false; }, 0); }
      };
      handle.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        from = { x: e.clientX, y: e.clientY, ...this.anchor() };
        moved = false;
        addEventListener("pointermove", move);
        addEventListener("pointerup", end);
        addEventListener("pointercancel", end);
      });
    }

    resizable(handle) {
      // Drags one edge or corner: the opposite side stays put, the box is re-pinned to the new top-right
      const edge = handle.dataset.edge;
      let from = null;
      const move = (e) => {
        const dx = e.clientX - from.x, dy = e.clientY - from.y;
        let { left, top, right, bottom } = from;
        if (edge.includes("w")) left += dx;
        if (edge.includes("e")) right += dx;
        if (edge.includes("n")) top += dy;
        if (edge.includes("s")) bottom += dy;
        this.setRect(left, top, right, bottom, edge);
      };
      const end = () => {
        removeEventListener("pointermove", move);
        removeEventListener("pointerup", end);
        removeEventListener("pointercancel", end);
        from = null;
        this.removeAttribute("resizing");
        this.style.cursor = "";
      };
      handle.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        const r = this.panel.getBoundingClientRect();
        from = { x: e.clientX, y: e.clientY, left: r.left, top: r.top, right: r.right, bottom: r.bottom };
        this.setAttribute("resizing", "");
        this.style.cursor = getComputedStyle(handle).cursor;
        addEventListener("pointermove", move);
        addEventListener("pointerup", end);
        addEventListener("pointercancel", end);
      });
    }

    setRect(left, top, right, bottom, edge = "") {
      // Applies a viewport rect: the moving sides are clamped to the screen, no minimum size (the sides just never cross)
      if (edge.includes("w")) left = Math.min(Math.max(left, 8), right);
      if (edge.includes("e")) right = Math.max(Math.min(right, innerWidth - 8), left);
      if (edge.includes("n")) top = Math.min(Math.max(top, 8), bottom);
      if (edge.includes("s")) bottom = Math.max(Math.min(bottom, innerHeight - 8), top);
      this.anchor();
      this.panel.style.inlineSize = `${right - left}px`;
      this.panel.style.blockSize = `${bottom - top}px`;
      this.panel.style.maxBlockSize = "none";
      this.moveTo(innerWidth - right, top);
    }

    sizeTo(w, h) {
      // Resizes keeping the top-right pin; against a screen edge the box slides away so it can still grow
      const { top, right } = this.anchor();
      w = Math.min(Math.max(w, 0), innerWidth - 16);
      h = Math.min(Math.max(h, 0), innerHeight - 16);
      this.panel.style.inlineSize = `${w}px`;
      this.panel.style.blockSize = `${h}px`;
      this.panel.style.maxBlockSize = "none";
      this.moveTo(Math.min(right, innerWidth - w - 8), Math.min(top, innerHeight - h - 8));
    }

    anchor() {
      // Pins the box by its top-right corner in inline styles (the stylesheet parks it in the corner until then)
      if (!this.style.top) {
        const r = this.getBoundingClientRect();
        this.style.top = `${r.top}px`;
        this.style.right = `${innerWidth - r.right}px`;
        this.style.bottom = "auto";
        this.style.left = "auto";
      }
      return { top: num(this.style.top), right: num(this.style.right) };
    }

    moveTo(right, top) {
      const w = this.offsetWidth, h = this.offsetHeight;
      this.style.right = `${Math.min(Math.max(right, 8), Math.max(innerWidth - w - 8, 8))}px`;
      this.style.top = `${Math.min(Math.max(top, 8), Math.max(innerHeight - h - 8, 8))}px`;
    }

    fit() {
      if (!this.style.top) return;
      this.moveTo(num(this.style.right), num(this.style.top));
      if (this.panel.style.inlineSize) this.sizeTo(num(this.panel.style.inlineSize), num(this.panel.style.blockSize));
    }

    fold(on) {
      this.toggleAttribute("folded", on);
      this.fit();
      this.paint();
    }

    dismiss() {
      // Puts the page's CSS back, drops every listener and leaves; the next page load mounts a fresh inspector
      this.reset();
      this.ro.disconnect();
      this.panelRo.disconnect();
      removeEventListener("resize", this.onResize);
      removeEventListener("scroll", this.onMove, { capture: true });
      this.remove();
    }

    toggle(open) {
      this.anchor();
      this.toggleAttribute("open", open);
      if (open) this.removeAttribute("folded");
      this.fab.setAttribute("aria-expanded", String(open));
      this.fit();
      if (open) {
        if (!this.loaded) { this.loaded = true; this.load(); }
        this.tabs.find((t) => t.getAttribute("aria-selected") === "true").focus();
      } else {
        this.fab.focus();
      }
      this.paint(); // labels dodge whichever chrome is showing
    }

    show(which) {
      this.tabs.forEach((t) => t.setAttribute("aria-selected", String(t.id === `tab-${which}`)));
      this.views.html.hidden = which !== "html";
      this.views.css.hidden = which !== "css";
      this.resetBtn.hidden = which !== "css";
      this.undoBtn.hidden = which !== "css";
    }

    async load() {
      this.loadHtml();
      await this.loadCss();
    }

    /* ---------- HTML tab ---------- */

    loadHtml() {
      const view = this.views.html;
      view.replaceChildren(this.span("c", "<!DOCTYPE html>"), "\n");
      this.tree(view, document.documentElement, "");
    }

    tree(out, el, indent) {
      const kids = [...el.childNodes].filter((n) => !skip(n));
      const textOnly = kids.every((n) => n.nodeType === 3);
      const row = document.createElement("button");
      row.type = "button";
      row.className = "el";
      row.setAttribute("aria-pressed", "false");
      row.append(this.openTag(el));
      // An element the page does not render (the head, display: none) has no box to show
      if (!el.getClientRects().length) { row.disabled = true; row.title = "Not rendered on the page"; }
      row.addEventListener("click", () => this.pick(el, row));
      out.append(indent, row);
      if (VOID.has(el.localName)) return;
      if (textOnly) {
        const text = squash(kids.map((n) => n.data).join(""));
        if (text) row.append(text);
        row.append(this.span("sel", `</${el.localName}>`));
        return;
      }
      for (const n of kids) {
        out.append("\n");
        if (n.nodeType === 1) this.tree(out, n, indent + "  ");
        else if (n.nodeType === 3) out.append(indent, "  ", squash(n.data));
        else if (n.nodeType === 8) out.append(indent, "  ", this.span("c", `<!--${n.data}-->`));
      }
      const close = this.span("cl", "");
      close.append(this.span("sel", `</${el.localName}>`));
      row.close = close;
      out.append("\n", indent, close);
    }

    openTag(el) {
      const f = document.createDocumentFragment();
      f.append(this.span("sel", `<${el.localName}`));
      for (const a of el.attributes) {
        f.append(" ", this.span("an", a.name));
        if (a.value !== "") f.append("=", `"${a.value}"`);
      }
      f.append(this.span("sel", ">"));
      return f;
    }

    pick(el, row) {
      const on = !this.picks.has(el);
      if (on) {
        const used = new Set([...this.picks.values()].map((p) => p.hue));
        let hue = 0;
        while (used.has(hue)) hue++;
        this.picks.set(el, { row, hue });
      } else this.picks.delete(el);
      const hue = on ? this.picks.get(el).hue : null;
      for (const n of [row, row.close]) {
        if (!n) continue;
        if (on) n.style.setProperty("--accent", `var(--pick-${hue % 6})`); else n.style.removeProperty("--accent");
      }
      row.setAttribute("aria-pressed", String(on));
      row.close?.classList.toggle("on", on);
      this.paint();
    }

    /* ---------- the overlay ---------- */

    marks() {
      // Everything to paint: picked elements as full box models, pinned/hovered declarations as their reach
      const list = [...this.picks].map(([el, p]) => ({ el, model: true, hue: p.hue }));
      const decls = new Set(this.pins);
      if (this.hover) decls.add(this.hover);
      for (const d of decls) for (const el of this.reach(d)) list.push({ el, decl: d });
      return list;
    }

    reach(d) {
      // The rendered elements a declaration's rule selects
      let els;
      try { els = [...document.querySelectorAll(d.rule.selectorText)]; } catch { return []; }
      return els.filter(rendered);
    }

    paint() {
      const marks = this.marks();
      this.ov.replaceChildren();
      this.placed = []; // label rects already on screen, so later labels can dodge them
      const keep = new Set(marks.map((m) => m.el));
      for (const el of this.watched) if (!keep.has(el)) { this.ro.unobserve(el); this.watched.delete(el); }
      for (const el of keep) if (!this.watched.has(el)) { this.ro.observe(el); this.watched.add(el); }
      if (!marks.length) return;
      const chrome = (this.hasAttribute("open") ? this.panel : this.fab).getBoundingClientRect();
      for (const m of marks) {
        if (m.model) {
          const g = document.createElement("div");
          g.className = "pick";
          g.style.setProperty("--accent", `var(--pick-${m.hue % 6})`);
          this.ov.append(g);
          this.into = g;
          this.paintModel(m.el, chrome);
          this.into = null;
        } else this.paintDecl(m.el, m.decl, chrome);
      }
    }

    box(cls, l, t, w, h) {
      const n = document.createElement("div");
      n.className = cls;
      n.style.cssText = `left:${l}px;top:${t}px;width:${w}px;height:${h}px`;
      (this.into || this.ov).append(n);
      return n;
    }

    label(cls, text, x, y) {
      const n = document.createElement("div");
      n.className = "lb " + cls;
      n.textContent = text;
      n.style.cssText = `left:${x}px;top:${y}px`;
      (this.into || this.ov).append(n);
      return n;
    }

    geometry(el) {
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      const side = (p) => ({ t: num(cs[`${p}Top`]), r: num(cs[`${p}Right`]), b: num(cs[`${p}Bottom`]), l: num(cs[`${p}Left`]) });
      const b = { t: num(cs.borderTopWidth), r: num(cs.borderRightWidth), b: num(cs.borderBottomWidth), l: num(cs.borderLeftWidth) };
      return { r, cs, p: side("padding"), m: side("margin"), b };
    }

    ring(cls, r, s, only, labelCls) {
      // A band drawn as the border of one box: outer edges r, thickness per side s (only the named sides)
      const w = { t: only.t ? s.t : 0, r: only.r ? s.r : 0, b: only.b ? s.b : 0, l: only.l ? s.l : 0 };
      const n = this.box(cls, r.left, r.top, r.width, r.height);
      n.style.borderWidth = `${w.t}px ${w.r}px ${w.b}px ${w.l}px`;
      if (w.t) this.fix(this.label(labelCls, fmt(w.t), r.left + r.width / 2, r.top + w.t / 2));
      if (w.b) this.fix(this.label(labelCls, fmt(w.b), r.left + r.width / 2, r.bottom - w.b / 2));
      if (w.l) this.fix(this.label(labelCls, fmt(w.l), r.left + w.l / 2, r.top + r.height / 2));
      if (w.r) this.fix(this.label(labelCls, fmt(w.r), r.right - w.r / 2, r.top + r.height / 2));
    }

    outer(r, m) {
      return { left: r.left - m.l, top: r.top - m.t, right: r.right + m.r, bottom: r.bottom + m.b, width: r.width + m.l + m.r, height: r.height + m.t + m.b };
    }

    paintModel(el, chrome) {
      // A picked element gets its outline, the measure lines and its name only; no fills, no padding/margin bands
      const r = el.getBoundingClientRect();
      this.box("box", r.left, r.top, r.width, r.height);
      // The element name sits in the top-left corner over the width line (inside the box near the top of the page)
      const above = r.top >= 36;
      const tag = this.label("tag", name(el), r.left, above ? r.top - 10 : r.top + 10);
      if (!above) tag.toggleAttribute("data-in", true);
      this.placeTag(tag, r, chrome);
      this.dims(r, chrome);
    }

    dims(r, chrome) {
      // Width line above the box, height line beside it; inside the edge when the viewport has no room
      const above = r.top >= 32;
      const w = this.box("ln w", r.left, above ? r.top - 10 : r.top + 10, r.width, 1);
      const beside = this.beside(r, chrome);
      const h = this.box("ln h", beside ? r.right + 10 : r.right - 10, r.top, 1, r.height);
      const wl = this.label("", `${fmt(r.width)}px`, 0, 0);
      const hl = this.label("", `${fmt(r.height)}px`, 0, 0);
      wl.style.top = `${num(w.style.top) + (above ? -12 : 12)}px`;
      hl.style.left = `${num(h.style.left) + (beside ? 8 : -8)}px`;
      hl.style.transform = beside ? "translate(0, -50%)" : "translate(-100%, -50%)";
      this.place(wl, "left", r.left, r.right, chrome);
      this.place(hl, "top", r.top, r.bottom, chrome);
    }

    placeTag(label, r, chrome) {
      // Starts in the corner, then walks right along the edge and, once the edge is full, up a row, until it clears
      // the panel and every label already placed (nested picks share a corner)
      const hits = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      const free = () => { const b = label.getBoundingClientRect(); return !hits(b, chrome) && !this.placed.some((p) => hits(b, p)); };
      const b = label.getBoundingClientRect(), step = b.width + 4, rows = b.height + 4;
      const top = num(label.style.top);
      for (let row = 0; row < 4 && !free(); row++) {
        label.style.top = `${top - row * rows}px`;
        for (let x = r.left; x + b.width <= r.right + 1 && !free(); x += step) label.style.left = `${x}px`;
        if (!free()) label.style.left = `${r.left}px`;
      }
      this.fix(label);
    }

    fix(label) {
      this.placed.push(label.getBoundingClientRect());
      return label;
    }

    beside(r, chrome) {
      // The height line stands outside the right edge when the viewport has room there and the panel is not over it
      if (innerWidth - r.right < 90) return false;
      return !(r.right + 10 < chrome.right && r.right + 90 > chrome.left && r.top < chrome.bottom && r.bottom > chrome.top);
    }

    place(label, side, from, to, chrome) {
      // Centers the label on its line, then slides it along the line until it clears the panel (or the pill)
      // and every label already placed; the first free spot nearest the centre wins
      const set = (mid) => { label.style[side] = `${mid}px`; };
      const hits = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      const free = () => { const b = label.getBoundingClientRect(); return !hits(b, chrome) && !this.placed.some((p) => hits(b, p)); };
      const mid = (from + to) / 2;
      set(mid);
      if (!free()) {
        const b = label.getBoundingClientRect();
        const size = side === "left" ? b.width : b.height, step = size * 0.6 + 4;
        const span = Math.max((to - from) / 2 - size / 2, 0);
        let found = false;
        for (let k = 1; k * step <= span && !found; k++) {
          for (const dir of [1, -1]) { set(mid + dir * k * step); if (free()) { found = true; break; } }
        }
        if (!found) set(mid);
      }
      this.fix(label);
    }

    paintDecl(el, d, chrome) {
      const { r, cs, p, m, b } = this.geometry(el);
      const band = sides(d.prop);
      if (band && band.kind === "padding") {
        this.ring("pd", { left: r.left + b.l, top: r.top + b.t, right: r.right - b.r, bottom: r.bottom - b.b, width: r.width - b.l - b.r, height: r.height - b.t - b.b }, p, band.sides, "pv");
      } else if (band) {
        const pos = { t: Math.max(m.t, 0), r: Math.max(m.r, 0), b: Math.max(m.b, 0), l: Math.max(m.l, 0) };
        this.ring("mr", this.outer(r, pos), pos, band.sides, "mv");
      }
      this.box("box", r.left, r.top, r.width, r.height);
      const tag = this.label("tag", name(el), r.left, r.top);
      if (r.top < 28) tag.toggleAttribute("data-in", true);
      this.fix(tag);
      if (!band && SIZE.test(d.prop)) this.sizeLine(el, d, r, cs, p, b, chrome);
    }

    sizeLine(el, d, r, cs, p, b, chrome) {
      // A line as long as the property resolves to, on the element's start edge; auto/none fall back to the box
      const horizontal = /inline-size|width/.test(d.prop);
      const resolved = num(cs[camel(d.prop)]);
      const content = cs.boxSizing === "content-box";
      const pad = content ? (horizontal ? b.l + p.l : b.t + p.t) : 0;
      const len = resolved || (horizontal ? r.width : r.height) - (content ? (horizontal ? b.l + b.r + p.l + p.r : b.t + b.b + p.t + p.b) : 0);
      const text = `${d.prop}: ${d.value}`;
      if (horizontal) {
        const above = r.top >= 32;
        const y = above ? r.top - 10 : r.top + 10;
        this.box("ln w", r.left + pad, y, len, 1);
        const l = this.label("", text, 0, y + (above ? -12 : 12));
        this.place(l, "left", r.left + pad, r.left + pad + len, chrome);
      } else {
        const beside = this.beside(r, chrome);
        const x = beside ? r.right + 10 : r.right - 10;
        this.box("ln h", x, r.top + pad, 1, len);
        const l = this.label("", text, x + (beside ? 8 : -8), 0);
        l.style.transform = beside ? "translate(0, -50%)" : "translate(-100%, -50%)";
        this.place(l, "top", r.top + pad, r.top + pad + len, chrome);
      }
    }

    /* ---------- CSS tab ---------- */

    async loadCss() {
      const view = this.views.css;
      view.replaceChildren();
      const sheets = [...document.styleSheets].filter((s) => {
        const node = s.ownerNode;
        if (!node || node.closest("fm-inspector")) return false;
        try { return !!s.cssRules; } catch { return false; } // cross-origin sheets are unreadable
      });
      if (!sheets.length) { view.textContent = "/* no stylesheet on this page */"; return; }
      for (const [index, sheet] of sheets.entries()) {
        let text;
        if (sheet.href) {
          try { text = await (await fetch(sheet.href, { cache: "force-cache" })).text(); } catch { text = null; }
        } else {
          text = sheet.ownerNode.textContent;
        }
        if (index) view.append("\n\n");
        if (sheets.length > 1) {
          const name = sheet.href ? new URL(sheet.href).pathname.split("/").pop() : "<style>";
          view.append(this.span("c", `/* ${name} */`), "\n\n");
        }
        if (text == null) { view.append(this.span("c", "/* stylesheet could not be read */")); continue; }
        const [nodes] = parseBlock(text, 0, text.length);
        link(nodes, sheet.cssRules);
        this.render(view, nodes, "");
      }
    }

    span(cls, text) {
      const s = document.createElement("span");
      s.className = cls;
      s.textContent = text;
      return s;
    }

    render(out, nodes, indent) {
      nodes.forEach((n, i) => {
        if (i) out.append("\n");
        switch (n.type) {
          case "blank": break;
          case "comment": out.append(indent, this.span("c", n.text)); break;
          case "flat": out.append(indent, n.text); break;
          case "opaque": out.append(indent, this.span("sel", n.head), " {", n.text.replace(/\n/g, "\n" + indent), "}"); break;
          case "group":
            out.append(indent, this.span("sel", n.head), " {\n");
            this.render(out, n.children, indent + "  ");
            out.append("\n", indent, "}");
            break;
          case "rule":
            out.append(indent, this.span("sel", n.head), " {\n");
            n.decls.forEach((d, j) => {
              if (j) out.append("\n");
              if (d.type === "blank") return;
              if (d.type === "comment") { out.append(indent, "  ", this.span("c", d.text)); return; }
              out.append(indent, "  ", this.declNode(d, n.rule));
              if (d.tail) out.append(this.span("c", d.tail));
            });
            out.append("\n", indent, "}");
            break;
        }
      });
    }

    declNode(d, rule) {
      const row = document.createElement("span");
      row.className = "d";
      const text = `${d.prop}: ${d.value}${d.important ? " !important" : ""};`;
      // A declaration the browser did not accept (or a rule the CSSOM could not pair) cannot be toggled
      const live = !!rule && rule.style.getPropertyValue(d.prop) !== "";
      if (!live) {
        row.classList.add("na");
        row.title = rule ? "This browser does not apply this declaration" : "This rule could not be matched on the page";
        row.append(this.span("t", text));
        return row;
      }
      d.rule = rule;
      d.orig = d.value;
      const box = document.createElement("input");
      box.type = "checkbox";
      box.checked = true;
      box.setAttribute("aria-label", `${d.prop}: ${d.value}`);
      box.addEventListener("change", () => { this.record({ d, box, row, node: value, before: { checked: !box.checked, value: d.value }, after: { checked: box.checked, value: d.value } }); this.apply(d, box.checked); });
      const show = document.createElement("button");
      show.type = "button";
      show.className = "t";
      show.textContent = `${d.prop}: `;
      show.setAttribute("aria-pressed", "false");
      show.title = `Show where ${rule.selectorText} lands`;
      show.addEventListener("click", () => {
        const on = !this.pins.has(d);
        if (on) this.pins.add(d); else this.pins.delete(d);
        show.setAttribute("aria-pressed", String(on));
        row.classList.toggle("on", on);
        this.paint();
      });
      const value = this.span("v", d.value);
      value.tabIndex = 0;
      value.setAttribute("role", "button");
      value.title = "Click to change the value";
      value.addEventListener("click", () => this.edit(d, row, value, box));
      value.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.edit(d, row, value, box); } });
      row.addEventListener("pointerenter", () => { this.hover = d; this.paint(); });
      row.addEventListener("pointerleave", () => { this.hover = null; this.paint(); });
      row.append(box, show, value, this.span("x", `${d.important ? " !important" : ""};`));
      this.decls.push({ d, box, row, value });
      return row;
    }

    edit(d, row, value, box) {
      // Swaps the value for a text field: every keystroke is tried on the page, arrows step the first number,
      // Enter or leaving keeps it, Escape puts back what was there when the field opened
      const start = d.value;
      const field = document.createElement("input");
      field.type = "text";
      field.className = "ed";
      field.value = d.value;
      field.setAttribute("aria-label", `${d.prop} value`);
      field.autocomplete = "off";
      field.spellcheck = false;
      const size = () => { field.style.inlineSize = `calc(${Math.max(field.value.length, 1) + 1}ch + 12px)`; };
      const set = (v) => { field.value = v; size(); return this.change(d, v); };
      field.addEventListener("input", () => { size(); field.setAttribute("aria-invalid", String(!this.change(d, field.value))); });
      field.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); field.blur(); }
        else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); set(start); field.blur(); } // the panel's own Escape must not fire
        else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          const m = field.value.match(/-?\d*\.?\d+/);
          if (!m) return;
          e.preventDefault();
          const step = (e.key === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 10 : e.altKey ? 0.1 : 1);
          const n = Math.round((parseFloat(m[0]) + step) * 1000) / 1000;
          field.setAttribute("aria-invalid", String(!set(field.value.slice(0, m.index) + n + field.value.slice(m.index + m[0].length))));
        }
      });
      field.addEventListener("blur", () => {
        // A value the page rejected is dropped; the last accepted one stays
        if (!this.change(d, field.value)) this.change(d, d.value);
        if (d.value !== start || !box.checked) this.record({ d, box, row, node: value, before: { checked: box.checked, value: start }, after: { checked: true, value: d.value } });
        value.textContent = d.value;
        box.checked = true;
        box.setAttribute("aria-label", `${d.prop}: ${d.value}`);
        row.classList.toggle("edited", d.value !== d.orig);
        field.replaceWith(value);
        this.paint();
      });
      size();
      value.replaceWith(field);
      field.focus();
      field.select();
    }

    change(d, v) {
      // Tries a value on the live rule; false when the browser does not take it (the previous value stays)
      v = v.trim();
      if (!v) return false;
      const before = d.rule.style.getPropertyValue(d.prop);
      d.rule.style.setProperty(d.prop, v, d.important ? "important" : "");
      const after = d.rule.style.getPropertyValue(d.prop);
      if (after === "" || (after === before && norm(after) !== norm(v))) {
        d.rule.style.setProperty(d.prop, d.value, d.important ? "important" : "");
        return false;
      }
      d.value = v;
      this.paint();
      return true;
    }

    apply(d, on) {
      if (on) d.rule.style.setProperty(d.prop, d.value, d.important ? "important" : "");
      else d.rule.style.removeProperty(d.prop);
      this.paint(); // a toggle can move a painted element without resizing it
    }

    reset() {
      const batch = [];
      for (const { d, box, row, value } of this.decls) {
        if (box.checked && d.value === d.orig) continue;
        batch.push({ d, box, row, node: value, before: { checked: box.checked, value: d.value }, after: { checked: true, value: d.orig } });
        this.restore({ d, box, row, node: value }, batch[batch.length - 1].after);
      }
      if (batch.length) this.record(batch);
    }

    record(entry) {
      this.history.push(entry);
      this.undoBtn.disabled = false;
    }

    undo() {
      const entry = this.history.pop();
      if (!entry) return;
      for (const step of [].concat(entry)) this.restore(step, step.before);
      this.undoBtn.disabled = !this.history.length;
    }

    restore(step, state) {
      // Puts a row into a recorded state: its value and whether it is ticked
      const { d, box, row, node } = step;
      d.value = state.value;
      node.textContent = d.value;
      box.setAttribute("aria-label", `${d.prop}: ${d.value}`);
      row.classList.toggle("edited", d.value !== d.orig);
      box.checked = state.checked;
      this.apply(d, state.checked);
    }
  }

  customElements.define("fm-inspector", Inspector);
  const mount = () => document.body.append(document.createElement("fm-inspector"));
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
