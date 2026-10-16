// Copyright 2026 Alper Donmez. All rights reserved.
// inspector.js v0.1.20

(() => {
  if (customElements.get("fm-inspector")) return;
  const VERSION = "0.1.20"; // keep in step with the line above; the host carries it as data-version

  const STYLE = `
    :host {
      --bg: light-dark(#ffffff, #161b26);
      --bg-2: light-dark(#f3f4f6, #0f1219);
      --border: light-dark(#e5e7eb, #2a3140);
      --text: light-dark(#1f2430, #e5e7eb);
      --muted: light-dark(#6b7280, #9aa3b2);
      --accent: light-dark(#2563eb, #60a5fa);
      --wash: color-mix(in srgb, var(--accent) 12%, transparent);
      --tag: light-dark(#2563eb, #7cb3ff);
      --attr: light-dark(#7c3aed, #b794f6);
      --val: light-dark(#2563eb, #7cb3ff);
      --flex: light-dark(#b45309, #fbbf24);
      /* the selection palette: one cool hue per picked element, cycling; orange and green stay margin/padding */
      --pick-0: #1d4ed8;
      --pick-1: #0284c7;
      --pick-2: #0d9488;
      --pick-3: #4f46e5;
      --pick-4: #7c3aed;
      --mar: rgba(245, 158, 11, 0.14);
      --mar-ink: #d97706;
      --pad: rgba(34, 197, 94, 0.16);
      --pad-ink: #16a34a;
      --dist: #dc2626;
      --css: light-dark(#c026d3, #e879f9); /* a hovered or pinned declaration, on the page and in its row: a family apart from the picks' blues */
      --chip: light-dark(#1f2430, #ffffff);
      --chip-text: light-dark(#ffffff, #1f2430);
      --chip-name: light-dark(#93c5fd, #2563eb);
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
    :host([theme="light"]) { color-scheme: light; }
    :host([theme="dark"]) { color-scheme: dark; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    button { font: inherit; color: inherit; background: none; border: 0; cursor: pointer; touch-action: manipulation; }
    button:focus-visible, input:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }

    .launcher { position: relative; display: inline-flex; z-index: 2; }
    :host([open]) .launcher { display: none; }
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
      z-index: 2;
      display: none;
      flex-direction: column;
      inline-size: min(23rem, calc(100vw - 16px));
      block-size: min(70vh, 40rem); /* one height on both tabs; the user's own resize overrides it */
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 14px;
      box-shadow: var(--shadow);
      overflow: hidden;
    }
    :host([open]) .panel { display: flex; }

    .head {
      display: flex;
      align-items: center;
      gap: 2px;
      flex: none; /* never squeezed by the body */
      block-size: 33px; /* a 32px bar plus the 1px rule under it (border-box) */
      padding: 0 8px 0 6px;
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
    .rz { position: absolute; display: none; touch-action: none; z-index: 3; }
    :host([open]:not([folded])) .rz { display: block; } /* no resize while folded to the head */
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

    /* the element picker: Chrome's select-an-element button, left of the tabs */
    .pickbtn { inline-size: 24px; block-size: 24px; display: inline-flex; align-items: center; justify-content: center; color: var(--muted); border-radius: 8px; margin-inline-end: 4px; }
    .pickbtn:hover { color: var(--text); background: var(--bg-2); }
    .pickbtn[aria-pressed="true"] { color: var(--accent); background: var(--wash); }
    .pickbtn svg { inline-size: 16px; block-size: 16px; }
    .tab {
      block-size: 32px;
      padding: 0 8px;
      font-size: 14px;
      font-weight: 600;
      color: var(--muted);
      border-block-end: 2px solid transparent;
      margin-block-end: -1px;
    }
    .tab:hover { color: var(--text); }
    .tab[aria-selected="true"] { color: var(--text); border-color: var(--accent); }
    .spacer { flex: 1; }
    .theme { inline-size: 24px; block-size: 24px; display: inline-flex; align-items: center; justify-content: center; color: var(--muted); border-radius: 8px; }
    .theme:hover { color: var(--text); background: var(--bg-2); }
    .foldbtn, .refresh { inline-size: 24px; block-size: 24px; color: var(--muted); border-radius: 6px; flex: none; }
    .foldbtn:hover, .refresh:hover { color: var(--text); background: var(--bg-2); }
    .status { padding: 4px 12px; font-size: 12px; color: var(--dist); white-space: normal; }
    .status:empty { display: none; }
    .theme svg { inline-size: 16px; block-size: 16px; }
    .theme .sun { display: none; }
    :host([theme="dark"]) .theme .sun { display: block; }
    :host([theme="dark"]) .theme .moon { display: none; }
    @media (prefers-color-scheme: dark) {
      :host(:not([theme])) .theme .sun { display: block; }
      :host(:not([theme])) .theme .moon { display: none; }
    }
    .reset { block-size: 22px; padding: 0 8px; font-size: 12px; font-weight: 600; color: var(--muted); border-radius: 8px; }
    .reset:hover { color: var(--text); background: var(--bg-2); }
    .close { inline-size: 24px; block-size: 24px; display: inline-flex; align-items: center; justify-content: center; color: var(--muted); border-radius: 8px; }
    .close:hover { color: var(--text); background: var(--bg-2); }
    .close svg { inline-size: 16px; block-size: 16px; }

    .body { overflow: auto; flex: 1; }
    .view { font-family: var(--mono); font-size: 13px; line-height: 1.5; tab-size: 2; }
    [hidden] { display: none !important; }

    /* HTML rows: one full-width row per element, the children indented, a caret folds a subtree */
    #view-html { display: inline-flex; flex-direction: column; min-inline-size: 100%; padding: 6px 0; }
    .row {
      display: flex;
      align-items: center;
      min-block-size: 24px;
      padding-inline: calc(8px + var(--d) * 14px) 12px;
      white-space: pre;
      border-inline-start: 3px solid transparent;
      cursor: pointer;
    }
    .row:hover { background: var(--bg-2); }
    .row[data-picked="true"] { background: color-mix(in srgb, var(--accent) 12%, transparent); border-color: var(--accent); }
    .row.na { cursor: default; opacity: 0.55; }
    .row.na:hover { background: none; }
    .pickrow { min-block-size: 24px; display: inline-flex; align-items: center; text-align: start; white-space: pre; flex: 1; }
    .row button:focus-visible { outline-offset: -2px; }
    .caret { flex: none; inline-size: 16px; block-size: 16px; display: inline-flex; align-items: center; justify-content: center; color: var(--muted); font-size: 9px; margin-inline-end: 2px; border-radius: 4px; }
    .caret::before { content: "\\25BE"; }
    .row[data-folded] .caret::before { content: "\\25B8"; }
    .caret.none { visibility: hidden; }
    .caret:hover { color: var(--text); background: var(--border); }
    .fold { display: none; }
    .row[data-folded] .fold { display: inline; }
    .tag { color: var(--tag); }
    .an { color: var(--attr); }
    .c { color: var(--muted); }

    /* CSS rows: groups of declarations under a selector head; the tick removes a declaration from the page */
    #view-css { padding: 8px 0; }
    .gh { display: flex; align-items: baseline; gap: 8px; padding: 10px 12px 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .gh .sel { color: var(--attr); }
    .grp.hit { box-shadow: inset 3px 0 0 var(--accent); }
    .grp.hit .gh .sel { color: var(--accent); font-weight: 700; background: color-mix(in srgb, var(--accent) 12%, transparent); padding: 0 4px; margin: 0 -4px; border-radius: 4px; }
    .grp[data-depth="1"] .gh, .grp[data-depth="1"] .d { padding-inline-start: 24px; }
    .d { display: flex; align-items: center; gap: 8px; min-block-size: 26px; padding-inline: 12px; border-radius: 0; }
    .d:hover { background: color-mix(in srgb, var(--css) 8%, transparent); }
    .d input[type="checkbox"] { inline-size: 16px; block-size: 16px; margin: 0; accent-color: var(--accent); cursor: pointer; flex: none; }
    .d .t { text-align: start; white-space: pre; border-radius: 4px; }
    .d .t[aria-pressed="true"] { color: var(--css); font-weight: 600; }
    .d.on { background: color-mix(in srgb, var(--css) 12%, transparent); }
    .d .v { color: var(--val); cursor: text; border-block-end: 1px dotted transparent; }
    .d .v:hover { border-color: var(--val); }
    .d.edited .v { font-weight: 600; }
    .d .sw { inline-size: 14px; block-size: 14px; border: 1px solid var(--border); border-radius: 3px; flex: none; }
    .d.off .t, .d.off .v, .d.off .x { text-decoration: line-through; color: var(--muted); }
    .d.off .sw { opacity: 0.4; }
    .d .ed {
      font: inherit;
      line-height: 1.3;
      color: var(--accent);
      background: var(--bg-2);
      border: 1px solid var(--accent);
      border-radius: 4px;
      padding: 1px 6px;
      min-inline-size: 5ch;
      box-shadow: 0 0 0 3px var(--wash);
    }
    .d .ed:focus { outline: none; }
    .d .ed[aria-invalid="true"] { border-color: var(--dist); color: var(--dist); }
    .d.na { opacity: 0.5; }
    .d.na .t { cursor: default; }
    .d.na:hover { background: none; }
    .cm { padding: 2px 12px; color: var(--muted); white-space: pre; }
    .empty { padding: 16px 12px; color: var(--muted); font-family: var(--font); }

    /* the overlay: fixed boxes painted over the page's elements */
    .ov { pointer-events: none; font-family: var(--mono); font-size: 11px; line-height: 1; }
    .pick-surface { display: none; position: fixed; inset: 0; z-index: 1; cursor: crosshair; touch-action: none; }
    :host([picking]) .pick-surface { display: block; }
    .ov div { position: fixed; }
    .ov .pick { position: static; }
    .box { border: 1.5px solid var(--accent); border-radius: 2px; }
    .probe .box { border-color: #2563eb; }
    .pd, .mr { border-style: solid; border-color: var(--pad); }
    .mr { border-color: var(--mar); }
    .gd { border: 0 dashed rgba(37, 99, 235, 0.35); }
    .gd.v { inline-size: 0; border-inline-start-width: 1px; }
    .gd.h { block-size: 0; border-block-start-width: 1px; }
    .lb {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 5px 8px;
      border-radius: 6px;
      background: var(--chip);
      color: var(--chip-text);
      white-space: nowrap;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
    }
    .lb .n { color: var(--chip-name); }
    .lb .fx { color: var(--flex); }
    .lb .bar { opacity: 0.4; }
    .lb.hue { background: var(--accent); color: #fff; }
    .lb.hue .n { color: #fff; font-weight: 700; }
    .lb.dch { padding: 3px 6px; border-radius: 4px; font-weight: 700; color: #fff; box-shadow: none; background: var(--dist); transform: translate(-50%, -50%); }
    .lb.pv { background: var(--pad-ink); color: #fff; padding: 2px 4px; font-size: 10px; transform: translate(-50%, -50%); }
    .lb.mv { background: var(--mar-ink); color: #fff; padding: 2px 4px; font-size: 10px; transform: translate(-50%, -50%); }
    .lb.sz { transform: translate(-50%, -50%); padding: 3px 6px; border-radius: 4px; font-weight: 700; background: var(--accent); color: #fff; box-shadow: none; }
    .dbox { border: 1.5px dashed var(--dist); border-radius: 2px; }
    .dln { background: var(--dist); }
    .ln { background: var(--accent); }
    .ln::before, .ln::after { content: ""; position: absolute; background: var(--accent); }
    .dim-width { block-size: 1px; }
    .dim-width::before, .dim-width::after { inline-size: 1px; block-size: 9px; inset-block-start: -4px; }
    .dim-width::before { inset-inline-start: 0; }
    .dim-width::after { inset-inline-end: 0; }
    .dim-height { inline-size: 1px; }
    .dim-height::before, .dim-height::after { block-size: 1px; inline-size: 9px; inset-inline-start: -4px; }
    .dim-height::before { inset-block-start: 0; }
    .dim-height::after { inset-block-end: 0; }

    /* the state pill at the page foot while the picker is armed */
    .state {
      position: fixed;
      inset-block-end: 20px;
      inset-inline-start: 50%;
      transform: translateX(-50%);
      display: none;
      padding: 10px 18px;
      font-size: 14px;
      font-weight: 600;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 999px;
      box-shadow: var(--shadow);
      pointer-events: none;
    }
    :host([picking]) .state { display: inline-flex; }

    @media (max-width: 480px) {
      /* phones: the open panel is a sheet fixed to the screen's foot, full width, rising from below; no drag, no resize */
      :host { inset-block-end: 8px; inset-inline-end: 8px; font-size: 12px; }
      :host([open]) { inset: auto 0 0 0 !important; }
      :host(:not([open])) { inset: auto auto 8px 50% !important; }
      :host(:not([open])) .launcher { transform: translateX(-50%); } /* the pill at the bottom centre; the transform sits on the pill, never on the host, so the fixed overlay keeps the viewport as its reference */
      .fab { min-block-size: 36px; padding: 0 12px; font-size: 12px; gap: 6px; }
      .panel { inline-size: 100vw !important; block-size: var(--sheet, 50vh) !important; max-block-size: 50vh !important; border-radius: 14px 14px 0 0; border-block-end: 0; box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.18); }
      :host([open]:not([folded])) .rz { display: none; }
      .head { position: relative; block-size: 45px; padding-block-start: 12px; cursor: default; flex: none; }
      .body { min-block-size: 0; }
      .head::before { content: ""; position: absolute; inset-block-start: 5px; inset-inline-start: 50%; inline-size: 36px; block-size: 4px; margin-inline-start: -18px; border-radius: 999px; background: var(--border); }
      .tab { padding: 0 4px; font-size: 12px; }
      .head { padding-inline: 4px; }
      .reset { padding-inline: 4px; }
      .view { font-size: 11px; }
      .state { inset-block-end: auto; inset-block-start: 8px; font-size: 12px; padding: 6px 12px; }
    }
    @media (pointer: coarse) {
      .row { min-block-size: 30px; }
      .pickrow { min-block-size: 30px; } /* taller rows: finger-sized targets */
      .d { min-block-size: 30px; }
      .d input[type="checkbox"] { inline-size: 18px; block-size: 18px; }
    }
    @media (prefers-reduced-motion: no-preference) {
      .panel { animation: rise 160ms ease-out; }
      @keyframes rise { from { opacity: 0; transform: translateY(8px); } }
      @media (max-width: 480px) {
        .panel { animation: slide 220ms ease-out; }
        @keyframes slide { from { transform: translateY(100%); } }
      }
    }
  `;

  const ICON_PICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6"/><path d="m12 12 4 10 1.7-4.3L22 16Z"/></svg>';
  const ICON_SUN = '<svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
  const ICON_MOON = '<svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>';
  const ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  const MARKUP = `
    <div class="ov" aria-hidden="true"></div>
    <div class="pick-surface" aria-hidden="true"></div>
    <div class="state" aria-hidden="true">Select an element · Esc to cancel</div>
    <div class="launcher"><button class="fab" type="button" aria-expanded="false" aria-controls="panel">Show code</button>
    <button class="bye" type="button" aria-label="Remove the code inspector" title="Remove until the next page load">${ICON_X}</button></div>
    <section class="panel" id="panel" aria-label="Code">
      <div class="head">
        <button class="pickbtn" type="button" aria-pressed="false" aria-label="Select an element on the page" title="Select an element on the page">${ICON_PICK}</button>
        <div role="tablist" aria-label="Code views">
          <button class="tab" type="button" role="tab" id="tab-html" tabindex="0" aria-selected="true" aria-controls="view-html">HTML</button>
          <button class="tab" type="button" role="tab" id="tab-css" tabindex="-1" aria-selected="false" aria-controls="view-css">CSS</button>
        </div>
        <span class="spacer"></span>
        <button class="theme" type="button" aria-label="Switch the inspector's theme" title="Light / dark">${ICON_SUN}${ICON_MOON}</button>
        <button class="foldbtn" type="button" aria-expanded="true" aria-controls="panel-body" aria-label="Collapse panel" title="Collapse / expand panel">▾</button>
        <button class="refresh" type="button" aria-label="Refresh code" title="Refresh HTML and CSS">↻</button>
        <button class="reset" type="button" title="Page CSS back, picks and pins cleared">Reset</button>
        <button class="close" type="button" aria-label="Hide code">${ICON_X}</button>
      </div>
      <div class="status" role="status" aria-live="polite"></div>
      <div class="body" id="panel-body">
        <div class="view" id="view-html" role="tabpanel" aria-labelledby="tab-html"></div>
        <div class="view" id="view-css" role="tabpanel" aria-labelledby="tab-css" hidden></div>
      </div>
    </section>
    ${["n", "s", "e", "w", "ne", "nw", "se", "sw"].map((e) => `<div class="rz ${e}" data-edge="${e}" aria-hidden="true"></div>`).join("")}`;

  /* ---------- helpers ---------- */

  const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  const skip = (n) =>
    (n.nodeType === 1 && (helper(n) || (n.localName === "script" && /inspector\.js/.test(n.getAttribute("src") || "")))) ||
    (n.nodeType === 8 && /inspector/i.test(n.data)) ||
    (n.nodeType === 3 && !n.data.trim());
  const squash = (s) => s.replace(/\s+/g, " ").trim();
  const helper = (el) => !!el?.closest?.("fm-inspector, #replit-pill-host"); // the inspector itself and the Replit badge are not the solution's code
  const rendered = (el) => el.isConnected && el.getClientRects().length > 0 && !helper(el);
  const num = (v) => parseFloat(v) || 0;
  const fmt = (n) => String(Math.round(n * 100) / 100);
  const camel = (p) => p.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  const name = (el) => el.localName + (el.id ? `#${el.id}` : "") + (el.classList.length ? "." + [...el.classList].join(".") : "");
  const PALETTE = 5;
  const TRUNC = 24; // text-only rows show this many characters while folded
  const COLORISH = /^(color|background(-color)?|border(-.*)?-color|outline-color|fill|stroke|caret-color|accent-color|text-decoration-color|column-rule-color)$/;
  const isColor = (prop, v) => COLORISH.test(prop) && CSS.supports("color", v);

  // Which sides a padding/margin property names: t r b l
  function sides(prop, cs = { writingMode: "horizontal-tb", direction: "ltr" }) {
    const m = prop.match(/^(padding|margin)(?:-(top|right|bottom|left|inline|block))?(?:-(start|end))?$/);
    if (!m) return null;
    const [, kind, part, half] = m;
    let s = { t: 1, r: 1, b: 1, l: 1 };
    if (part === "top") s = { t: 1 }; else if (part === "right") s = { r: 1 }; else if (part === "bottom") s = { b: 1 }; else if (part === "left") s = { l: 1 };
    else if (part === "inline" || part === "block") {
      const vertical = /^(vertical|sideways)/.test(cs.writingMode);
      const rtl = cs.direction === "rtl";
      const reversed = cs.writingMode === "sideways-lr";
      const inline = vertical ? ((rtl !== reversed) ? ["b", "t"] : ["t", "b"]) : (rtl ? ["r", "l"] : ["l", "r"]);
      const block = vertical ? (/-(rl)$/.test(cs.writingMode) ? ["r", "l"] : ["l", "r"]) : ["t", "b"];
      const pair = part === "inline" ? inline : block;
      s = half ? { [pair[half === "start" ? 0 : 1]]: 1 } : { [pair[0]]: 1, [pair[1]]: 1 };
    }
    return { kind, sides: s };
  }
  const SIZE = /^(min-|max-)?(inline-size|block-size|width|height)$/;

  /* ---------- a small CSS reader: keeps comments and blank lines, maps rules onto the CSSOM ---------- */

  const CONDITIONAL = /^@(media|supports|layer|container|scope)\b/;

  function parseBlock(src, pos, end, lines) {
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
      const line = lines(i);
      if (src[brace] === ";") { nodes.push({ type: "flat", text: head + ";" }); i = brace + 1; continue; }
      const blockEnd = matchBrace(src, brace, end);
      if (head.startsWith("@") && CONDITIONAL.test(head)) {
        const [children] = parseBlock(src, brace + 1, blockEnd, lines);
        nodes.push({ type: "group", head, children, line });
      } else if (head.startsWith("@keyframes") || head.startsWith("@-webkit-keyframes")) {
        nodes.push({ type: "opaque", head, text: src.slice(brace + 1, blockEnd), line });
      } else {
        nodes.push({ type: "rule", head, decls: parseDecls(src, brace + 1, blockEnd), line });
      }
      i = blockEnd + 1;
    }
    return [nodes, i];
  }

  function scanTo(src, i, end, stops) {
    let parens = 0, brackets = 0, braces = 0, quote = null;
    for (; i < end; i++) {
      const ch = src[i];
      if (quote) { if (ch === "\\") i++; else if (ch === quote) quote = null; continue; }
      if (ch === "\\") { i++; continue; }
      if (ch === '"' || ch === "'") { quote = ch; continue; }
      if (src.startsWith("/*", i)) { const c = src.indexOf("*/", i + 2); i = c < 0 ? end : c + 1; continue; }
      if (!parens && !brackets && !braces && stops.includes(ch)) return i;
      if (ch === "(") parens++; else if (ch === ")") parens = Math.max(0, parens - 1);
      else if (ch === "[") brackets++; else if (ch === "]") brackets = Math.max(0, brackets - 1);
      else if (ch === "{") braces++; else if (ch === "}") braces = Math.max(0, braces - 1);
    }
    return -1;
  }


  function matchBrace(src, open, end) {
    let depth = 0, q = null;
    for (let i = open; i < end; i++) {
      const ch = src[i];
      if (q) { if (ch === "\\") i++; else if (ch === q) q = null; continue; }
      if (ch === "\\") { i++; continue; }
      if (ch === '"' || ch === "'") { q = ch; continue; }
      if (src.startsWith("/*", i)) { const c = src.indexOf("*/", i + 2); i = c === -1 ? end : c + 1; continue; }
      if (ch === "{") depth++;
      else if (ch === "}" && --depth === 0) return i;
    }
    return end;
  }

  function parseDecls(src, pos, end) {
    const items = [];
    let i = pos;
    while (i < end) {
      while (i < end && /\s/.test(src[i])) i++;
      if (i >= end) break;
      if (src.startsWith("/*", i)) {
        const close = src.indexOf("*/", i + 2), stop = close < 0 ? end : Math.min(end, close + 2);
        items.push({ type: "comment", text: src.slice(i, stop) }); i = stop; continue;
      }
      let stop = scanTo(src, i, end, ";{");
      if (stop >= 0 && src[stop] === "{") {
        const prefix = src.slice(i, stop), colon = scanTo(prefix, 0, prefix.length, ":");
        if (colon < 0 || !/^--/.test(prefix.slice(0, colon).trim())) {
          // Nested rules belong to the CSSOM child list, never to a declaration value.
          i = Math.min(end, matchBrace(src, stop, end) + 1); continue;
        }
        stop = scanTo(src, i, end, ";");
      }
      const raw = src.slice(i, stop < 0 ? end : stop).trim();
      i = stop < 0 ? end : stop + 1;
      const colon = scanTo(raw, 0, raw.length, ":");
      if (colon < 0) { if (raw) items.push({ type: "comment", text: raw }); continue; }
      let prop = raw.slice(0, colon).trim(), value = raw.slice(colon + 1).trim();
      if (!prop.startsWith("--")) prop = prop.toLowerCase();
      const priority = /!\s*(?:\/\*[\s\S]*?\*\/\s*)*important\s*$/i;
      const important = priority.test(value);
      if (important) value = value.replace(priority, "").trimEnd();
      items.push({ type: "decl", prop, value, important, on: true });
    }
    return items;
  }

  const headerCache = new Map();
  const norm = (text) => text.trim(); // Never fold case, strings or descendant combinators.
  function ruleHead(rule) {
    if (typeof rule.selectorText === "string") return rule.selectorText;
    const at = scanTo(rule.cssText, 0, rule.cssText.length, "{");
    return (at < 0 ? rule.cssText : rule.cssText.slice(0, at)).trim();
  }
  function canonicalHead(head) {
    if (headerCache.has(head)) return headerCache.get(head);
    let result = head.trim();
    try {
      const sheet = new CSSStyleSheet(); sheet.replaceSync(`${head} {}`);
      result = sheet.cssRules.length ? ruleHead(sheet.cssRules[0]) : null;
    } catch { /* Exact matching is the safe fallback in older browsers. */ }
    if (headerCache.size > 2000) headerCache.clear();
    headerCache.set(head, result); return result;
  }
  function link(nodes, cssRules, cond = []) {
    let cursor = 0;
    for (const n of nodes) {
      if (!["rule", "group", "opaque", "flat"].includes(n.type)) continue;
      const wanted = canonicalHead(n.head || n.text.replace(/;$/, ""));
      if (wanted == null) continue;
      const k = Array.from(cssRules).findIndex((r, index) => index >= cursor && norm(ruleHead(r)) === wanted);
      if (k < 0) continue;
      const r = cssRules[k]; cursor = k + 1; n.cond = cond; n.cssRule = r;
      if (n.type === "rule" && r.style) n.rule = r;
      if (n.type === "group" && r.cssRules) link(n.children, r.cssRules, [...cond, n.head]);
    }
  }
  function resolveSelector(child, parent) {
    if (!parent) return child;
    let out = "", quote = null, amp = false;
    for (let i = 0; i < child.length; i++) {
      const ch = child[i];
      if (ch === "\\") { out += ch + (child[++i] || ""); continue; }
      if (quote) { out += ch; if (ch === quote) quote = null; continue; }
      if (ch === '"' || ch === "'") { quote = ch; out += ch; }
      else if (ch === "&") { out += `:is(${parent})`; amp = true; }
      else out += ch;
    }
    return amp ? out : `:is(${parent}) :is(${child})`;
  }


  /* ---------- the element ---------- */

  class Inspector extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot) { this.connect(); return; }
      this.setAttribute("data-version", VERSION);
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
      this.pickBtn = $(".pickbtn");
      this.rows = new Map(); // element -> its HTML row
      this.picking = false;
      this.alt = false; // Alt held while picking: the probe measures its distance from the last pick
      this.probe = null; // the element under the pointer while picking
      this.focusEl = null; // the last picked element: full box model on the page, its matched rules in the CSS tab
      this.panel = $(".panel");
      this.head = $(".head");
      this.body = $(".body");
      this.closeBtn = $(".close");
      this.resetBtn = $(".reset");
      this.themeBtn = $(".theme");
      this.foldBtn = $(".foldbtn");
      this.status = $(".status");
      this.ov = $(".ov");
      this.pickSurface = $(".pick-surface");
      this.tabs = [...root.querySelectorAll('[role="tab"]')];
      this.views = { html: $("#view-html"), css: $("#view-css") };
      this.models = [];
      this.modelOf = new WeakMap();
      this.dirtyModels = new Set();
      this.cssSources = new WeakMap();
      this.probeName = `--fm-inspector-${Math.random().toString(36).slice(2)}-active`;
      this.sheets = []; // parsed stylesheets: { name, nodes, rules }
      this.allDecls = []; // every live declaration, for Reset
      this.rowOf = new Map(); // declaration -> its rendered row parts, for the current CSS view
      this.picks = new Map(); // element -> { row, hue } (hue = palette slot, the lowest one free at pick time)
      this.pins = new Set(); // pinned CSS declarations
      this.hover = null; // the CSS declaration under the pointer
      this.loaded = false;
      this.ro = new ResizeObserver(() => this.paint());
      this.watched = new Set(); // elements the overlay follows (observe() fires once on its own, so the set never churns)

      this.onMove = () => this.paint();

      this.fab.addEventListener("click", () => this.toggle(true));
      this.closeBtn.addEventListener("click", () => this.toggle(false));
      this.resetBtn.addEventListener("click", () => this.resetAll());
      this.foldBtn.addEventListener("click", () => this.fold(!this.hasAttribute("folded")));
      $(".refresh").addEventListener("click", () => this.load());
      this.themeBtn.addEventListener("click", () => this.setTheme(this.dark() ? "light" : "dark"));
      try { const t = localStorage.getItem("fm-inspector-theme"); if (t === "light" || t === "dark") this.setAttribute("theme", t); } catch {}
      this.byeBtn.addEventListener("click", () => this.dismiss());
      this.pickBtn.addEventListener("click", () => this.setPicking(!this.picking));
      this.tabs.forEach((t) => t.addEventListener("click", () => { this.fold(false); this.show(t.id === "tab-css" ? "css" : "html"); t.focus(); }));
      // A click on the head's bare surface folds the panel down to the head, and back
      this.head.addEventListener("click", (e) => { if (!e.target.closest("button") && !this.phone()) this.fold(!this.hasAttribute("folded")); });
      this.head.title = "Click to fold, drag to move";
      root.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && this.hasAttribute("open")) { e.preventDefault(); this.toggle(false); }
        if (e.target.getAttribute("role") === "tab" && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
          e.preventDefault();
          const i = this.tabs.indexOf(e.target);
          const next = e.key === "Home" ? this.tabs[0] : e.key === "End" ? this.tabs.at(-1) : this.tabs[(i + (e.key === "ArrowRight" ? 1 : this.tabs.length - 1)) % this.tabs.length];
          next.focus();
          next.click();
        }
      });
      // A drag that moved the box must not count as a click on what it started over
      root.addEventListener("click", (e) => { if (this.dragged) { e.stopPropagation(); e.preventDefault(); } }, true);
      this.draggable(this.head);
      this.draggable(this.fab);
      this.sheetDrag(this.head);
      root.querySelectorAll(".rz").forEach((h) => this.resizable(h));
      this.onResize = () => { this.fit(); this.markHits(); this.paint(); };
      this.panelRo = new ResizeObserver(this.onResize);
      this.show("html");
      this.connect();
    }

    dark() {
      // The scheme the panel shows right now: its own override, else the OS
      const t = this.getAttribute("theme");
      return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    }

    setTheme(t) {
      // Overrides the OS scheme for the inspector alone (light-dark() follows the host's color-scheme), remembered per browser
      this.setAttribute("theme", t);
      try { localStorage.setItem("fm-inspector-theme", t); } catch {}
    }

    /* ---------- floating box: drag, and shrink or grow where it stands ---------- */

    connect() {
      if (this.connected) return;
      this.connected = true;
      this.runtime = new AbortController();
      const signal = this.runtime.signal;
      this.wasPhone = !this.phone();
      this.fit();
      this.ro.observe(document.documentElement);
      this.panelRo.observe(this.panel);
      addEventListener("resize", this.onResize, { signal });
      addEventListener("scroll", this.onMove, { capture: true, passive: true, signal });
      globalThis.visualViewport?.addEventListener("resize", this.onResize, { signal });
      this.mo = new MutationObserver((records) => {
        const ours = (n) => n === this.cursorStyle || helper(n?.nodeType === 1 ? n : n?.parentElement);
        const own = (r) => ours(r.target) || (r.type === "childList" && [...r.addedNodes, ...r.removedNodes].length > 0 && [...r.addedNodes, ...r.removedNodes].every(ours));
        if (records.every(own)) return;
        this.htmlDirty = true;
        this.prunePicks();
        const sheetish = (n) => n?.nodeType === 1 && !ours(n) && (n.matches("style, link[rel~='stylesheet'], [style]") || !!n.querySelector("style, link[rel~='stylesheet'], [style]"));
        const cssChange = records.some((r) => !own(r) && (
          (r.type === "attributes" && (r.attributeName === "style" || r.target.matches("style, link"))) ||
          (r.target.nodeType === 1 ? r.target.closest("style") : r.target.parentElement?.closest("style")) ||
          [...r.addedNodes, ...r.removedNodes].some(sheetish)
        ));
        if ((this.loaded || this.loading) && cssChange) this.queueLoad();
        this.markHits(); this.paint();
      });
      this.mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
      document.addEventListener("load", (event) => {
        if (event.target?.matches?.("link[rel~='stylesheet']") && (this.loaded || this.loading)) this.queueLoad();
      }, { capture: true, signal });
      // CSSOM edits and adopted sheets do not produce DOM mutation records.
      // Poll only while the inspector is in use; reopening also refreshes it.
      this.cssTimer = setInterval(() => {
        if (!this.loaded || (!this.hasAttribute("open") && !this.pins.size && !this.picking)) return;
        const snapshot = this.cssSnapshot();
        if (!this.sameSnapshot(this.cssState, snapshot)) this.queueLoad();
      }, 500);
      if (this.loaded) this.queueLoad();
      this.paint();
    }

    disconnectedCallback() { this.editor?.finish(true); this.dispose(); }

    dispose() {
      if (!this.connected) return;
      this.cancelGesture?.();
      this.setPicking(false);
      this.connected = false;
      this.runtime.abort();
      this.ro.disconnect(); this.panelRo.disconnect(); this.mo.disconnect();
      this.watched.clear();
      cancelAnimationFrame(this.paintFrame); this.paintFrame = null;
      cancelAnimationFrame(this.refreshFrame); this.refreshFrame = null;
      clearInterval(this.cssTimer);
      this.loadAgain = false;
      clearTimeout(this.clickTimer); this.dragged = false;
    }

    prunePicks() {
      for (const [el] of this.picks) if (!el.isConnected) this.picks.delete(el);
      if (!this.focusEl?.isConnected) this.focusEl = [...this.picks.keys()].pop() || null;
    }

    gesture(e, move, done) {
      this.cancelGesture?.();
      const ctrl = new AbortController(), target = e.currentTarget, id = e.pointerId;
      let ended = false;
      const end = (event, cancelled = false) => {
        if (ended) return;
        if (event && event.pointerId != null && event.pointerId !== id) return;
        ended = true; ctrl.abort(); this.cancelGesture = null;
        if (target.hasPointerCapture?.(id)) target.releasePointerCapture(id);
        this.removeAttribute("dragging"); this.removeAttribute("resizing"); this.style.cursor = "";
        done(event, cancelled || event?.type === "pointercancel");
      };
      this.cancelGesture = () => end(null, true);
      const options = { signal: ctrl.signal };
      addEventListener("pointermove", (event) => { if (event.pointerId === id) move(event); }, options);
      addEventListener("pointerup", end, options);
      addEventListener("pointercancel", end, options);
      target.addEventListener("lostpointercapture", (event) => end(event, true), options);
      try { target.setPointerCapture(id); } catch { /* Window listeners still cover the gesture. */ }
    }

    suppressClick() {
      this.dragged = true; clearTimeout(this.clickTimer);
      this.clickTimer = setTimeout(() => { this.dragged = false; }, 100);
    }

    draggable(handle) {
      handle.addEventListener("pointerdown", (e) => {
        if (e.button !== 0 || this.phone() || (handle === this.head && e.target.closest("button, input, a"))) return;
        e.preventDefault();
        const from = { x: e.clientX, y: e.clientY, ...this.anchor() };
        let moved = false;
        this.gesture(e, (event) => {
          const dx = event.clientX - from.x, dy = event.clientY - from.y;
          if (!moved && Math.hypot(dx, dy) < 4) return;
          moved = true; this.setAttribute("dragging", "");
          this.moveTo(from.right - dx, from.top + dy); this.paint();
        }, (_, cancelled) => {
          if (cancelled) this.moveTo(from.right, from.top);
          if (moved) this.suppressClick();
        });
      });
    }

    phone() { return matchMedia("(max-width: 480px)").matches; }

    sheetDrag(handle) {
      handle.addEventListener("pointerdown", (e) => {
        if (e.button !== 0 || !this.phone() || this.hasAttribute("folded") || e.target.closest("button, input, a")) return;
        e.preventDefault();
        const from = { y: e.clientY, height: this.panel.getBoundingClientRect().height };
        let moved = false, height = from.height;
        this.gesture(e, (event) => {
          const dy = event.clientY - from.y;
          if (!moved && Math.abs(dy) < 4) return;
          moved = true; this.setAttribute("dragging", "");
          height = Math.min(Math.max(from.height - dy, this.head.offsetHeight), innerHeight / 2);
          this.panel.style.setProperty("--sheet", `${height}px`);
        }, (_, cancelled) => {
          this.panel.style.removeProperty("--sheet");
          if (moved) this.suppressClick();
          if (!cancelled && moved && height < Math.min(120, from.height * 0.6) && this.isConnected) this.toggle(false);
          this.paint();
        });
      });
    }

    resizable(handle) {
      const edge = handle.dataset.edge;
      handle.addEventListener("pointerdown", (e) => {
        if (e.button !== 0 || this.phone() || this.hasAttribute("folded")) return;
        e.preventDefault();
        const r = this.panel.getBoundingClientRect(), from = { x: e.clientX, y: e.clientY, left: r.left, top: r.top, right: r.right, bottom: r.bottom };
        this.setAttribute("resizing", ""); this.style.cursor = getComputedStyle(handle).cursor;
        this.gesture(e, (event) => {
          const dx = event.clientX - from.x, dy = event.clientY - from.y;
          let { left, top, right, bottom } = from;
          if (edge.includes("w")) left += dx; if (edge.includes("e")) right += dx;
          if (edge.includes("n")) top += dy; if (edge.includes("s")) bottom += dy;
          this.setRect(left, top, right, bottom, edge);
        }, (_, cancelled) => {
          if (cancelled) this.setRect(from.left, from.top, from.right, from.bottom);
          this.suppressClick(); this.paint();
        });
      });
    }


    setRect(left, top, right, bottom, edge = "") {
      if (this.phone()) return;
      const minW = Math.min(280, innerWidth - 16), minH = Math.min(100, innerHeight - 16);
      if (edge.includes("w")) left = Math.min(Math.max(left, 8), right - minW);
      if (edge.includes("e")) right = Math.max(Math.min(right, innerWidth - 8), left + minW);
      if (edge.includes("n")) top = Math.min(Math.max(top, 8), bottom - minH);
      if (edge.includes("s")) bottom = Math.max(Math.min(bottom, innerHeight - 8), top + minH);
      this.anchor();
      this.panel.style.inlineSize = `${right - left}px`;
      this.panel.style.blockSize = `${bottom - top}px`;
      this.panel.style.maxBlockSize = "none";
      this.moveTo(innerWidth - right, top);
    }

    sizeTo(w, h) {
      // Resizes keeping the top-right pin; against a screen edge the box slides away so it can still grow
      if (this.phone()) return;
      const { top, right } = this.anchor();
      w = Math.min(Math.max(w, Math.min(280, innerWidth - 16)), innerWidth - 16);
      h = Math.min(Math.max(h, Math.min(100, innerHeight - 16)), innerHeight - 16);
      this.panel.style.inlineSize = `${w}px`;
      this.panel.style.blockSize = `${h}px`;
      this.panel.style.maxBlockSize = "none";
      this.moveTo(Math.min(right, innerWidth - w - 8), Math.min(top, innerHeight - h - 8));
    }

    anchor() {
      // Pins the box by its top-right corner in inline styles (the stylesheet parks it in the corner until then)
      if (this.phone()) return { top: 0, right: 0 };
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
      if (this.phone()) return;
      const w = this.offsetWidth, h = this.offsetHeight;
      this.style.right = `${Math.min(Math.max(right, 8), Math.max(innerWidth - w - 8, 8))}px`;
      this.style.top = `${Math.min(Math.max(top, 8), Math.max(innerHeight - h - 8, 8))}px`;
      this.desktop = { top: this.style.top, right: this.style.right, width: this.panel.style.inlineSize, height: this.panel.style.blockSize };
    }

    fit() {
      const phone = this.phone();
      if (phone !== this.wasPhone) {
        this.cancelGesture?.();
        this.wasPhone = phone;
        if (phone) {
          this.panel.style.removeProperty("inline-size");
          this.panel.style.removeProperty("block-size");
          this.panel.style.removeProperty("--sheet");
        } else if (this.desktop) {
          Object.assign(this.style, { top: this.desktop.top, right: this.desktop.right, bottom: "auto", left: "auto" });
          this.panel.style.inlineSize = this.desktop.width;
          this.panel.style.blockSize = this.desktop.height;
        }
      }
      if (phone || !this.style.top) return;
      this.moveTo(num(this.style.right), num(this.style.top));
      if (this.panel.style.inlineSize) this.sizeTo(num(this.panel.style.inlineSize), num(this.panel.style.blockSize));
    }

    fold(on) {
      if (on && this.editor && !this.editor.finish(false)) this.editor.finish(true);
      this.toggleAttribute("folded", on);
      this.foldBtn.setAttribute("aria-expanded", String(!on));
      this.foldBtn.setAttribute("aria-label", on ? "Expand panel" : "Collapse panel");
      this.foldBtn.textContent = on ? "▸" : "▾";
      this.fit();
      this.paint();
    }

    dismiss() {
      this.resetAll();
      this.dispose();
      this.remove();
    }

    toggle(open) {
      if (!open && this.editor && !this.editor.finish(false)) this.editor.finish(true);
      this.anchor();
      this.toggleAttribute("open", open);
      if (open) this.fold(false);
      this.fab.setAttribute("aria-expanded", String(open));
      this.fit();
      if (open) {
        this.load();
        this.tabs.find((t) => t.getAttribute("aria-selected") === "true").focus();
      } else {
        this.setPicking(false);
        this.fab.focus();
      }
      this.paint(); // labels dodge whichever chrome is showing
    }

    show(which) {
      this.tabs.forEach((t) => {
        const on = t.id === `tab-${which}`;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
      });
      this.views.html.hidden = which !== "html";
      this.views.css.hidden = which !== "css";
      if (which === "html" && this.htmlDirty && this.loaded) this.loadHtml();
    }

    queueLoad() {
      if (!this.connected) return;
      if (this.loading) { this.loadAgain = true; return; }
      if (this.refreshFrame != null) return;
      this.refreshFrame = requestAnimationFrame(() => { this.refreshFrame = null; this.load(); });
    }

    load() {
      if (!this.connected) return Promise.resolve();
      cancelAnimationFrame(this.refreshFrame); this.refreshFrame = null;
      this.loadAgain = true;
      if (this.loading) return this.loading;
      const runtime = this.runtime;
      this.loading = (async () => {
        do {
          this.loadAgain = false;
          this.loadHtml();
          await this.loadCss();
          if (runtime.signal.aborted || this.runtime !== runtime) return;
          this.loaded = true;
          if (this.editor?.field.getAttribute("aria-invalid") !== "true") this.status.textContent = "";
        } while (this.loadAgain && this.connected);
      })().catch((e) => {
        if (e.name !== "AbortError" && this.isConnected) this.status.textContent = "CSS could not be loaded. Use Refresh to retry.";
      }).finally(() => {
        this.loading = null;
        if (this.connected && (this.loadAgain || this.runtime !== runtime)) this.queueLoad();
      });
      return this.loading;
    }


    /* ---------- HTML tab: the body as rows ---------- */

    setPickedRow(row, on) {
      row.dataset.picked = String(on);
      row.pickButton?.setAttribute("aria-pressed", String(on));
    }

    loadHtml() {
      const folds = new Set([...this.rows].filter(([, row]) => row.hasAttribute("data-folded")).map(([el]) => el));
      const focused = this.shadowRoot.activeElement?.closest(".row")?.pageElement;
      this.rows = new Map();
      const fragment = document.createDocumentFragment();
      this.tree(fragment, document.body, 0);
      this.views.html.replaceChildren(fragment);
      for (const el of folds) { const row = this.rows.get(el); if (row) this.setFolded(row, true); }
      this.prunePicks();
      for (const [el, pick] of this.picks) {
        pick.row = this.rows.get(el); if (!pick.row) continue;
        this.setPickedRow(pick.row, true);
        pick.row.style.setProperty("--accent", `var(--pick-${pick.hue % PALETTE})`);
      }
      if (focused) this.rows.get(focused)?.pickButton.focus();
      this.htmlDirty = false;
    }

    tree(out, el, depth) {
      const kids = [...el.childNodes].filter((n) => !skip(n));
      const textOnly = kids.length > 0 && kids.every((n) => n.nodeType === 3);
      const row = this.row(depth); row.pageElement = el;
      const caret = document.createElement("button");
      caret.type = "button"; caret.className = "caret"; row.caret = caret;
      caret.setAttribute("aria-label", "Collapse element"); caret.setAttribute("aria-expanded", "true");
      const select = document.createElement("button");
      select.type = "button"; select.className = "pickrow"; select.setAttribute("aria-pressed", "false");
      select.setAttribute("aria-label", `Select ${name(el)}`); select.append(this.openTag(el)); row.pickButton = select;
      select.addEventListener("click", () => this.pick(el, row));
      row.append(caret, select); this.setPickedRow(row, false);
      this.rows.set(el, row); out.append(row);
      if (!rendered(el)) { row.classList.add("na"); row.title = "Not rendered on the page"; select.disabled = true; }
      const foldable = !VOID.has(el.localName) && kids.length > 0;
      if (!foldable) { caret.classList.add("none"); caret.disabled = true; caret.tabIndex = -1; if (!VOID.has(el.localName)) select.append(this.span("tag", `</${el.localName}>`)); return; }
      caret.addEventListener("click", () => this.setFolded(row, !row.hasAttribute("data-folded")));
      if (textOnly) {
        const text = squash(kids.map((n) => n.data).join(""));
        row.tx = this.span("tx", text); row.full = text;
        select.append(row.tx, this.span("tag", `</${el.localName}>`));
        if (text.length > TRUNC) this.setFolded(row, true);
        else { caret.classList.add("none"); caret.disabled = true; caret.tabIndex = -1; }
        return;
      }
      select.append(this.span("fold c", "…"), this.span("fold tag", `</${el.localName}>`));
      for (const n of kids) {
        if (n.nodeType === 1) this.tree(out, n, depth + 1);
        else { const child = this.row(depth + 1); child.append(this.span(n.nodeType === 8 ? "c" : "tx", n.nodeType === 8 ? `<!--${n.data}-->` : squash(n.data))); out.append(child); }
      }
      const close = this.row(depth); close.classList.add("cl"); close.append(this.span("tag", `</${el.localName}>`));
      out.append(close); row.close = close;
    }

    row(depth) {
      const row = document.createElement("div"); row.className = "row"; row.style.setProperty("--d", depth); return row;
    }


    openTag(el) {
      // One span for the whole tag: a flex row drops bare whitespace text between items
      const f = this.span("ot", "");
      f.append(this.span("tag", `<${el.localName}`));
      for (const a of el.attributes) {
        f.append(" ", this.span("an", a.name));
        if (a.value !== "") f.append(`="${a.value}"`);
      }
      f.append(this.span("tag", ">"));
      return f;
    }

    setFolded(row, on) {
      // Hides the rows between an element's open and close rows; a text-only row just slices its text
      row.toggleAttribute("data-folded", on);
      row.caret?.setAttribute("aria-expanded", String(!on));
      row.caret?.setAttribute("aria-label", on ? "Expand element" : "Collapse element");
      if (row.tx) { row.tx.textContent = on ? row.full.slice(0, TRUNC).trimEnd() + " …" : row.full; return; }
      if (!row.close) return;
      let n = row.nextElementSibling;
      while (n && n !== row.close) {
        n.hidden = on;
        if (!on && n.hasAttribute("data-folded") && n.close) { // a folded subtree inside stays folded
          let m = n.nextElementSibling;
          while (m && m !== n.close) { m.hidden = true; m = m.nextElementSibling; }
          n.close.hidden = true;
          n = n.close;
        }
        n = n.nextElementSibling;
      }
      row.close.hidden = on;
    }

    reveal(el) {
      // Unfolds every ancestor row so the element's row is on screen, then scrolls the list to it
      const row = this.rows.get(el);
      if (!row) return;
      for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
        const r = this.rows.get(a);
        if (r && r.hasAttribute("data-folded")) this.setFolded(r, false);
      }
      if (this.views.html.hidden) return;
      const body = this.body.getBoundingClientRect(), b = row.getBoundingClientRect();
      if (b.top < body.top || b.bottom > body.bottom) this.body.scrollTop += b.top - body.top - this.body.clientHeight / 2;
    }

    /* ---------- the picker: choose an element on the page itself ---------- */

    pickTarget(event) {
      const path = event.composedPath();
      if (!path.includes(this.pickSurface)) return path.includes(this) ? null : event.target;
      // Temporarily exclude only the transparent shield from hit testing.
      this.pickSurface.style.pointerEvents = "none";
      const point = event.touches?.[0] || event.changedTouches?.[0] || event;
      try { return document.elementFromPoint(point.clientX, point.clientY); }
      finally { this.pickSurface.style.pointerEvents = ""; }
    }

    setPicking(on) {
      if (on === this.picking) return;
      this.picking = on;
      this.pickBtn.setAttribute("aria-pressed", String(on));
      this.toggleAttribute("picking", on);
      if (on) {
        this.cursorStyle ||= Object.assign(document.createElement("style"), { textContent: "html, html *:not(fm-inspector) { cursor: crosshair !important; }" });
        document.head.append(this.cursorStyle);
        this.pickerRuntime = new AbortController();
        const options = { capture: true, passive: false, signal: this.pickerRuntime.signal };
        this.onPickInput = (event) => {
          const target = this.pickTarget(event);
          if (!target || helper(target)) {
            if (event.type === "pointermove" && this.probe) { this.probe = null; this.paint(); }
            return;
          }
          // The shield receives real pointer input instead of the underlying page.
          // Window capture also guards directly dispatched events before document/target handlers.
          if (event.cancelable) event.preventDefault();
          event.stopImmediatePropagation();
          if (event.type === "pointermove") {
            this.alt = event.altKey;
            if (target.nodeType === 1 && (target !== this.probe || this.alt !== this.altWas)) {
              this.probe = target; this.altWas = this.alt; this.paint();
            }
          } else if (event.type === "click" && event.button === 0 && target.nodeType === 1) this.select(target);
        };
        this.onPickKey = (event) => {
          if (event.composedPath().includes(this)) return;
          if (event.key === "Escape") {
            event.preventDefault(); event.stopImmediatePropagation(); this.setPicking(false); this.pickBtn.focus();
          }
          if (event.key === "Alt" && this.alt !== (event.type === "keydown")) { this.alt = event.type === "keydown"; this.paint(); }
        };
        for (const type of ["pointermove", "pointerdown", "pointerup", "pointercancel", "mousedown", "mouseup", "click", "dblclick", "contextmenu", "touchstart", "touchmove", "touchend"]) {
          addEventListener(type, this.onPickInput, options);
        }
        addEventListener("keydown", this.onPickKey, options);
        addEventListener("keyup", this.onPickKey, options);
      } else {
        this.pickerRuntime?.abort();
        this.cursorStyle?.remove();
        this.probe = null;
        this.alt = false;
        this.paint();
      }
    }

    select(el) {
      // A page click toggles the element's pick; a new pick lights its HTML row and opens the CSS tab on the rules that select it
      let row = this.rows.get(el);
      if (!row) { this.loadHtml(); row = this.rows.get(el); }
      if (!row) return;
      const was = this.picks.has(el);
      this.pick(el, row);
      if (was) return;
      this.fold(false);
      this.reveal(el);
      this.show("css");
      this.scrollToHit();
    }

    pick(el, row) {
      const on = !this.picks.has(el);
      if (on) {
        const used = new Set([...this.picks.values()].map((p) => p.hue));
        let hue = 0;
        while (used.has(hue)) hue++;
        this.picks.set(el, { row, hue });
        row.style.setProperty("--accent", `var(--pick-${hue % PALETTE})`);
      } else {
        this.picks.delete(el);
        row.style.removeProperty("--accent");
      }
      this.setPickedRow(row, on);
      if (on) this.focusEl = el; else if (this.focusEl === el) this.focusEl = [...this.picks.keys()].pop() || null;
      this.markHits();
      this.paint();
    }

    /* ---------- the overlay ---------- */

    marks() {
      // Everything to paint: picked elements, the probe under the picker, pinned/hovered declarations as their reach
      const list = [...this.picks].map(([el, p]) => ({ el, model: true, hue: p.hue }));
      if (this.probe && !this.picks.has(this.probe)) {
        if (this.alt && this.focusEl) list.push({ el: this.probe, dist: true });
        else list.push({ el: this.probe, probe: true });
      }
      const decls = new Set(this.pins);
      if (this.hover) decls.add(this.hover);
      for (const d of decls) for (const el of this.reach(d)) list.push({ el, decl: d });
      return list;
    }

    reach(d) {
      if (!d.on) return [];
      const model = d.model;
      if (this.reachCache?.has(model)) return this.reachCache.get(model);
      let candidates = [];
      if (model.inlineEl) candidates = [model.inlineEl];
      else if (model.selector) {
        // Nested, scoped and container rules are judged by the browser, so every element is a candidate
        const nativeSelectors = model.scoped || model.wraps.some((h) => !h.startsWith("@"));
        if (nativeSelectors) candidates = [...document.querySelectorAll("*")];
        else try { candidates = [...document.querySelectorAll(model.selector)]; } catch { candidates = []; }
      }
      const result = this.matchModel(model, candidates.filter(rendered));
      this.reachCache?.set(model, result); return result;
    }

    paint() {
      if (!this.connected || this.paintFrame != null) return;
      this.paintFrame = requestAnimationFrame(() => {
        this.paintFrame = null;
        if (this.htmlDirty && this.loaded && this.hasAttribute("open") && !this.views.html.hidden && !this.editor) this.loadHtml();
        this.draw();
      });
    }

    draw() {
      this.prunePicks(); this.geometryCache = new Map(); this.reachCache = new Map();
      const marks = this.marks().filter((m) => rendered(m.el));
      for (const { el } of marks) this.geometry(el);
      this.ov.replaceChildren(); this.placed = [];
      const keep = new Set(marks.map((m) => m.el));
      for (const el of this.watched) if (!keep.has(el)) { this.ro.unobserve(el); this.watched.delete(el); }
      for (const el of keep) if (!this.watched.has(el)) { this.ro.observe(el); this.watched.add(el); }
      const chrome = (this.hasAttribute("open") ? this.panel : this.fab).getBoundingClientRect();
      for (const m of marks) {
        const group = document.createElement("div"); group.className = m.probe ? "pick probe" : m.decl ? "pick decl" : "pick";
        if (m.model) group.style.setProperty("--accent", `var(--pick-${m.hue % PALETTE})`);
        if (m.decl) group.style.setProperty("--accent", "var(--css)");
        this.ov.append(group); this.into = group;
        if (m.model) this.paintModel(m.el, m.hue, chrome);
        else if (m.probe) this.paintProbe(m.el, chrome);
        else if (m.dist) this.paintDistance(this.focusEl, m.el, chrome);
        else this.paintDecl(m.el, m.decl, chrome);
      }
      this.into = null; this.geometryCache = null; this.reachCache = null;
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
      if (typeof text === "string") n.textContent = text; else n.append(...text);
      n.style.cssText = `left:${x}px;top:${y}px`;
      (this.into || this.ov).append(n);
      return n;
    }

    geometry(el) {
      if (this.geometryCache?.has(el)) return this.geometryCache.get(el);
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      const side = (p) => ({ t: num(cs[`${p}Top`]), r: num(cs[`${p}Right`]), b: num(cs[`${p}Bottom`]), l: num(cs[`${p}Left`]) });
      const b = { t: num(cs.borderTopWidth), r: num(cs.borderRightWidth), b: num(cs.borderBottomWidth), l: num(cs.borderLeftWidth) };
      const result = { r, cs, p: side("padding"), m: side("margin"), b };
      this.geometryCache?.set(el, result);
      return result;
    }

    ring(cls, r, s, only, labelCls) {
      // A band drawn as the border of one box: outer edges r, thickness per side s (only the named sides)
      const w = { t: only.t ? s.t : 0, r: only.r ? s.r : 0, b: only.b ? s.b : 0, l: only.l ? s.l : 0 };
      const n = this.box(cls, r.left, r.top, r.width, r.height);
      n.style.borderWidth = `${w.t}px ${w.r}px ${w.b}px ${w.l}px`;
      if (!labelCls) return;
      if (w.t) this.fix(this.label(labelCls, fmt(w.t), r.left + r.width / 2, r.top + w.t / 2));
      if (w.b) this.fix(this.label(labelCls, fmt(w.b), r.left + r.width / 2, r.bottom - w.b / 2));
      if (w.l) this.fix(this.label(labelCls, fmt(w.l), r.left + w.l / 2, r.top + r.height / 2));
      if (w.r) this.fix(this.label(labelCls, fmt(w.r), r.right - w.r / 2, r.top + r.height / 2));
    }

    outer(r, m) {
      return { left: r.left - m.l, top: r.top - m.t, right: r.right + m.r, bottom: r.bottom + m.b, width: r.width + m.l + m.r, height: r.height + m.t + m.b };
    }

    chipParts(el, r, size = true) {
      // name · W × H, a flex/grid word when the element lays out its children that way
      const parts = [this.span("n", name(el))];
      if (size) parts.push(this.span("bar", "|"), this.span("", `${fmt(r.width)} × ${fmt(r.height)}`));
      const d = this.geometry(el).cs.display;
      if (/flex|grid/.test(d)) parts.push(this.span("fx", d.replace("inline-", "")));
      return parts;
    }

    paintModel(el, hue, chrome) {
      // A picked element: its frame, the width and height lines with their sizes, the name chip in its hue;
      // the last pick also draws the guide lines across the viewport
      const r = this.geometry(el).r;
      if (el === this.focusEl) {
        this.box("gd v", r.left, 0, 0, innerHeight);
        this.box("gd v", r.right, 0, 0, innerHeight);
        this.box("gd h", 0, r.top, innerWidth, 0);
        this.box("gd h", 0, r.bottom, innerWidth, 0);
      }
      this.box("box", r.left, r.top, r.width, r.height);
      this.chip(this.label("hue", this.chipParts(el, r, false), 0, 0), r, chrome);
      this.dims(r, chrome);
    }

    dims(r, chrome) {
      // Width line above the box, height line beside it; inside the edge when the viewport has no room
      const above = r.top >= 32;
      const w = this.box("ln dim-width", r.left, above ? r.top - 10 : r.top + 10, r.width, 1);
      const beside = this.beside(r, chrome);
      const h = this.box("ln dim-height", beside ? r.right + 10 : r.right - 10, r.top, 1, r.height);
      const wl = this.label("sz", `${fmt(r.width)}px`, 0, 0);
      const hl = this.label("sz", `${fmt(r.height)}px`, 0, 0);
      wl.style.top = `${num(w.style.top) + (above ? -12 : 12)}px`;
      hl.style.left = `${num(h.style.left) + (beside ? 8 : -8)}px`;
      hl.style.transform = beside ? "translate(0, -50%)" : "translate(-100%, -50%)";
      this.place(wl, "left", r.left, r.right, chrome);
      this.place(hl, "top", r.top, r.bottom, chrome);
    }

    paintProbe(el, chrome) {
      // The element under the picker: its frame, the width and height lines with their sizes, the name chip
      const r = this.geometry(el).r;
      this.box("box", r.left, r.top, r.width, r.height);
      this.chip(this.label("", this.chipParts(el, r, false), 0, 0), r, chrome);
      this.dims(r, chrome);
    }

    paintDistance(from, to, chrome) {
      // Alt while picking: the gap between the last pick and the element under the pointer, along the nearest side
      const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
      this.box("dbox", b.left, b.top, b.width, b.height);
      let line = null, gap = 0, chipX, chipY;
      const mid = (lo1, hi1, lo2, hi2) => { const lo = Math.max(lo1, lo2), hi = Math.min(hi1, hi2); return lo < hi ? (lo + hi) / 2 : (lo1 + hi1) / 2; };
      if (b.left >= a.right) { gap = b.left - a.right; const y = mid(a.top, a.bottom, b.top, b.bottom); line = this.box("dln", a.right, y, gap, 1); chipX = a.right + gap / 2; chipY = y; }
      else if (b.right <= a.left) { gap = a.left - b.right; const y = mid(a.top, a.bottom, b.top, b.bottom); line = this.box("dln", b.right, y, gap, 1); chipX = b.right + gap / 2; chipY = y; }
      else if (b.top >= a.bottom) { gap = b.top - a.bottom; const x = mid(a.left, a.right, b.left, b.right); line = this.box("dln", x, a.bottom, 1, gap); chipX = x; chipY = a.bottom + gap / 2; }
      else if (b.bottom <= a.top) { gap = a.top - b.bottom; const x = mid(a.left, a.right, b.left, b.right); line = this.box("dln", x, b.bottom, 1, gap); chipX = x; chipY = b.bottom + gap / 2; }
      if (line) this.label("dch", fmt(gap), chipX, chipY);
      this.chip(this.label("", this.chipParts(to, b), 0, 0), b, chrome);
    }

    chip(label, r, chrome) {
      // The name chip: above the element, else below, else inside its top-left corner; never over the panel or another chip
      const h = label.getBoundingClientRect().height;
      const spots = [];
      if (r.top - h - 8 >= 0) spots.push([r.left, r.top - h - 8]);
      if (r.bottom + h + 8 <= innerHeight) spots.push([r.left, r.bottom + 8]);
      spots.push([r.left + 8, r.top + 8]);
      const hits = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      let last;
      for (const [x, y] of spots) {
        label.style.left = `${Math.max(x, 0)}px`;
        label.style.top = `${y}px`;
        const b = label.getBoundingClientRect();
        last = b;
        if (b.right > innerWidth) { label.style.left = `${Math.max(innerWidth - b.width, 0)}px`; last = label.getBoundingClientRect(); }
        if (!hits(last, chrome) && !this.placed.some((p) => hits(last, p))) break;
      }
      this.clamp(label);
      this.placed.push(label.getBoundingClientRect());
    }

    fix(label) {
      this.clamp(label);
      this.placed.push(label.getBoundingClientRect());
      return label;
    }

    clamp(label) {
      // Keeps a label inside the viewport, whatever transform it wears
      const b = label.getBoundingClientRect();
      let dx = 0, dy = 0;
      if (b.left < 4) dx = 4 - b.left; else if (b.right > innerWidth - 4) dx = innerWidth - 4 - b.right;
      if (b.top < 4) dy = 4 - b.top; else if (b.bottom > innerHeight - 4) dy = innerHeight - 4 - b.bottom;
      if (dx) label.style.left = `${num(label.style.left) + dx}px`;
      if (dy) label.style.top = `${num(label.style.top) + dy}px`;
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
        if (!found) {
          // No room along the line: step off it, row by row, until the label clears everything
          set(mid);
          const cross = side === "left" ? "top" : "left", thick = (side === "left" ? b.height : b.width) + 4;
          const base = num(label.style[cross]);
          for (let k = 1; k <= 4 && !found; k++) {
            for (const dir of [-1, 1]) { label.style[cross] = `${base + dir * k * thick}px`; if (free()) { found = true; break; } }
          }
          if (!found) label.style[cross] = `${base}px`;
        }
      }
      this.fix(label);
    }

    paintDecl(el, d, chrome) {
      // A hovered or pinned declaration: where its rule lands, with the band or size it sets; no name chip
      const { r, cs, p, m, b } = this.geometry(el);
      const band = sides(d.prop, cs);
      if (band && band.kind === "padding") {
        this.ring("pd", { left: r.left + b.l, top: r.top + b.t, right: r.right - b.r, bottom: r.bottom - b.b, width: r.width - b.l - b.r, height: r.height - b.t - b.b }, p, band.sides, "pv");
      } else if (band) {
        const pos = { t: Math.max(m.t, 0), r: Math.max(m.r, 0), b: Math.max(m.b, 0), l: Math.max(m.l, 0) };
        this.ring("mr", this.outer(r, pos), pos, band.sides, "mv");
      }
      this.box("box", r.left, r.top, r.width, r.height);
      if (!band && SIZE.test(d.prop)) this.sizeLine(el, d, r, cs, p, b, chrome);
    }

    sizeLine(el, d, r, cs, p, b, chrome) {
      // A line as long as the property resolves to, on the element's start edge; auto/none fall back to the box
      const vertical = /^(vertical|sideways)/.test(cs.writingMode);
      const horizontal = /width/.test(d.prop) || (/inline-size/.test(d.prop) && !vertical) || (/block-size/.test(d.prop) && vertical);
      const resolved = num(cs[camel(d.prop)]);
      const content = cs.boxSizing === "content-box";
      const pad = content ? (horizontal ? b.l + p.l : b.t + p.t) : 0;
      const len = Number.isFinite(parseFloat(cs[camel(d.prop)])) ? resolved : (horizontal ? r.width : r.height) - (content ? (horizontal ? b.l + b.r + p.l + p.r : b.t + b.b + p.t + p.b) : 0);
      const text = `${d.prop}: ${d.value}`;
      if (horizontal) {
        const above = r.top >= 32;
        const y = above ? r.top - 10 : r.top + 10;
        this.box("ln dim-width", r.left + pad, y, len, 1);
        const l = this.label("sz", text, 0, y + (above ? -12 : 12));
        this.place(l, "left", r.left + pad, r.left + pad + len, chrome);
      } else {
        const beside = this.beside(r, chrome);
        const x = beside ? r.right + 10 : r.right - 10;
        this.box("ln dim-height", x, r.top + pad, 1, len);
        const l = this.label("sz", text, x + (beside ? 8 : -8), 0);
        l.style.transform = beside ? "translate(0, -50%)" : "translate(-100%, -50%)";
        this.place(l, "top", r.top + pad, r.top + pad + len, chrome);
      }
    }

    /* ---------- CSS tab ---------- */

    sourceSheets() {
      return [...new Set([...document.styleSheets, ...(document.adoptedStyleSheets || [])])]
        .filter((sheet) => !sheet.ownerNode || (sheet.ownerNode !== this.cursorStyle && !helper(sheet.ownerNode)));
    }

    cssSnapshot() {
      const text = (sheet, seen = new Set()) => {
        if (seen.has(sheet)) return "";
        seen.add(sheet);
        try {
          return `${sheet.disabled}:${sheet.media?.mediaText || ""}:` + [...sheet.cssRules]
            .map((rule) => rule.cssText + (rule.styleSheet ? text(rule.styleSheet, seen) : "")).join("\n");
        } catch { return "unreadable"; }
      };
      return this.sourceSheets().map((sheet) => ({ sheet, text: text(sheet) }));
    }

    sameSnapshot(a, b) {
      return !!a && a.length === b.length && a.every((item, index) => item.sheet === b[index].sheet && item.text === b[index].text);
    }

    async loadCss() {
      const generation = this.cssGeneration = (this.cssGeneration || 0) + 1;
      const signal = this.runtime.signal;
      const entries = () => this.sourceSheets().map((sheet, index) => {
        let rules;
        try { rules = sheet.cssRules; } catch { rules = null; }
        return { sheet, rules, name: sheet.href ? new URL(sheet.href).pathname.split("/").pop() : sheet.ownerNode ? "<style>" : `<adopted stylesheet ${index + 1}>`, text: sheet.ownerNode?.localName === "style" ? sheet.ownerNode.textContent : this.cssSources.get(sheet)?.text ?? null };
      });
      const build = () => {
        this.models = []; this.allDecls = []; this.sheets = [];
        for (const entry of entries()) {
          if (!entry.rules) { this.sheets.push({ name: entry.name, nodes: [], unread: true }); continue; }
          const source = entry.text == null ? [] : parseBlock(entry.text, 0, entry.text.length, () => 0)[0];
          link(source, entry.rules);
          this.sheets.push({ name: entry.name, nodes: this.cssNodes(entry.rules, source, null, [], new Set(), [entry.sheet]), unread: false });
        }
        const inline = [];
        for (const el of document.querySelectorAll("[style]")) {
          if (helper(el) || !el.style.length) continue;
          const head = `${name(el)} (inline)`;
          const model = this.cssModel(el, head, parseDecls(el.getAttribute("style"), 0, el.getAttribute("style").length), { inlineEl: el, selector: null, wraps: [] });
          inline.push({ type: "rule", head, rule: model.rule, model, decls: model.decls });
        }
        if (inline.length) this.sheets.push({ name: "Inline styles", nodes: inline });
        if (!this.editor) this.renderCss(); else this.pendingCssRender = true;
        this.cssState = this.cssSnapshot();
        this.paint();
      };
      // Live CSSOM is available immediately; source fetches only enrich comments and authored fallbacks.
      build();
      await Promise.all(entries().map(async (entry) => {
        if (!entry.sheet.href || !entry.rules || this.cssSources.has(entry.sheet)) return;
        const abort = new AbortController();
        const cancelled = () => abort.abort(); signal.addEventListener("abort", cancelled, { once: true });
        const timer = setTimeout(cancelled, 5000);
        try {
          const response = await fetch(entry.sheet.href, { cache: "force-cache", signal: abort.signal });
          if (response.ok) this.cssSources.set(entry.sheet, { text: await response.text() });
        } catch { /* Keep live CSSOM data when the original source is unavailable. */ }
        finally { clearTimeout(timer); signal.removeEventListener("abort", cancelled); }
      }));
      if (signal.aborted || !this.isConnected || generation !== this.cssGeneration) throw new DOMException("Disconnected", "AbortError");
      build();
    }

    cssNodes(rules, source = [], parent = null, wraps = [], seen = new Set(), sheetChain = []) {
      const nodes = [], sourceByRule = new Map();
      for (const n of source) if (n.rule || n.cssRule) sourceByRule.set(n.rule || n.cssRule, n);
      let sourceCursor = 0;
      for (const rule of rules) {
        const authored = sourceByRule.get(rule), sourceIndex = source.indexOf(authored);
        if (sourceIndex >= sourceCursor) {
          for (const n of source.slice(sourceCursor, sourceIndex)) if (["comment", "blank"].includes(n.type)) nodes.push(n);
          sourceCursor = sourceIndex + 1;
        }
        const head = ruleHead(rule);
        if (rule.styleSheet) {
          if (seen.has(rule.styleSheet)) continue;
          seen.add(rule.styleSheet);
          try {
            const media = rule.media?.mediaText;
            let extra = media && media !== "all" ? [...wraps, `@media ${media}`] : wraps;
            if (rule.supportsText) extra = [...extra, `@supports (${rule.supportsText})`];
            nodes.push({ type: "group", head, children: this.cssNodes(rule.styleSheet.cssRules, [], parent, extra, seen, [...sheetChain, rule.styleSheet]) });
          } catch { nodes.push({ type: "comment", text: `${head} /* imported stylesheet is unreadable */` }); }
        } else if (/^@(?:-webkit-)?keyframes\b/.test(head)) {
          nodes.push({ type: "opaque", head });
        } else if (rule.style) {
          const ownSelector = typeof rule.selectorText === "string" ? rule.selectorText : null;
          const declarationOnly = !ownSelector && !!parent && !head.startsWith("@");
          const selector = ownSelector ? resolveSelector(ownSelector, parent) : declarationOnly ? parent : null;
          const meta = { selector, wraps, declarationOnly, ownSelector, inlineEl: null, sheetChain };
          const model = this.cssModel(rule, declarationOnly ? `${parent} (nested declarations)` : head, authored?.decls, meta);
          let children = [];
          if (rule.cssRules?.length) children = this.cssNodes(rule.cssRules, [], selector, [...wraps, head], seen, sheetChain);
          nodes.push({ type: "rule", head: model.head, rule, model, decls: model.decls, children });
        } else if (rule.cssRules) {
          nodes.push({ type: "group", head, children: this.cssNodes(rule.cssRules, authored?.children || [], parent, [...wraps, head], seen, sheetChain) });
        } else nodes.push({ type: "flat", text: rule.cssText });
      }
      for (const n of source.slice(sourceCursor)) if (["comment", "blank"].includes(n.type)) nodes.push(n);
      return nodes;
    }

    cssModel(owner, head, sourceDecls, meta) {
      let model = this.modelOf.get(owner);
      const pinned = model?.decls.some((d) => this.pins.has(d) || this.hover === d || this.editor?.declaration === d);
      if (!model || (!this.dirtyModels.has(model) && !pinned)) {
        const rule = meta.inlineEl ? { style: owner.style, selectorText: "element.style" } : owner;
        model = { rule, head, ...meta, baseline: rule.style.cssText, originalAttribute: meta.inlineEl?.getAttribute("style") ?? null };
        let decls = sourceDecls || [], accepted = false;
        if (decls.length) {
          const text = decls.filter((d) => d.type === "decl").map((d) => `${d.prop}: ${d.value}${d.important ? " !important" : ""};`).join("\n");
          try { accepted = this.scratch(model, text).cssText === model.baseline; } catch { accepted = false; }
        }
        if (!accepted) decls = parseDecls(rule.style.cssText, 0, rule.style.cssText.length);
        if (!decls.some((d) => d.type === "decl")) decls = [...rule.style].map((prop) => ({ type: "decl", prop, value: rule.style.getPropertyValue(prop), important: rule.style.getPropertyPriority(prop) === "important", on: true }));
        model.nativeFallback = !!sourceDecls && !accepted;
        model.decls = decls.map((entry) => {
          if (entry.type !== "decl") return { ...entry };
          const d = { ...entry, model, rule, orig: entry.value, on: true };
          try { d.live = this.validValue(d, d.value); } catch { d.live = false; }
          return d;
        });
        model.sourceText = model.baseline;
        model.lastApplied = model.baseline;
        this.modelOf.set(owner, model);
      } else {
        Object.assign(model, { head, ...meta });
        if (model.rule.style.cssText !== model.lastApplied || model.rule.style.cssText !== model.sourceText) this.reconcileModel(model);
      }
      model.scoped = model.wraps.some((h) => /^@scope\b/.test(h));
      this.models.push(model);
      this.allDecls.push(...model.decls.filter((d) => d.type === "decl" && d.live));
      return model;
    }

    matchModel(model, elements) {
      if (!elements.length) return [];
      const source = model.sheetChain?.[0];
      if (source?.ownerNode) {
        if (!source.ownerNode.isConnected || source.ownerNode.sheet !== source) return [];
      } else if (source && !document.adoptedStyleSheets.includes(source)) return [];
      for (const sheet of model.sheetChain || []) {
        if (sheet.disabled) return [];
        const media = sheet.media?.mediaText;
        if (media && !matchMedia(media).matches) return [];
      }
      if (model.inlineEl) return elements.filter((el) => el === model.inlineEl && el.isConnected);
      if (!model.selector) return [];
      const native = model.wraps.some((h) => !h.startsWith("@") || /^@(container|scope|starting-style)\b/.test(h));
      if (!native) {
        for (const h of model.wraps) {
          if (/^@media\b/.test(h) && !matchMedia(h.replace(/^@media\s*/, "")).matches) return [];
          if (/^@supports\b/.test(h)) { try { if (!CSS.supports(h.replace(/^@supports\s*/, ""))) return []; } catch { return []; } }
        }
        return elements.filter((el) => { try { return el.matches(model.selector); } catch { return false; } });
      }
      // Ask the browser to evaluate nesting/container/scope with a non-inherited, temporary marker.
      // No element attributes, existing declarations, or layout properties are changed.
      let previous;
      try {
        const sheet = new CSSStyleSheet();
        const property = this.probeName;
        const declaration = `${property}: 1 !important;`;
        let body = model.declarationOnly ? declaration : `${model.ownSelector || model.selector} { ${declaration} }`;
        body = model.wraps.reduceRight((inner, head) => `${head} { ${inner} }`, body);
        sheet.replaceSync(`@property ${property} { syntax: "*"; inherits: false; initial-value: 0; }\n${body}`);
        if (!sheet.cssRules[0]?.cssText.startsWith("@property")) return [];
        previous = [...document.adoptedStyleSheets];
        document.adoptedStyleSheets = [...previous, sheet];
        return elements.filter((el) => getComputedStyle(el).getPropertyValue(property).trim() === "1");
      } catch { return []; }
      finally { if (previous) document.adoptedStyleSheets = previous; }
    }


    span(cls, text) {
      const s = document.createElement("span");
      s.className = cls;
      s.textContent = text;
      return s;
    }

    renderCss() {
      // Every stylesheet, every rule, in source order; the last pick's matching rules are then lit in place
      const view = this.views.css;
      view.replaceChildren();
      this.rowOf = new Map();
      this.groups = []; // { node, el }: each rendered rule and its group box
      if (!this.sheets.length) { view.append(this.note("No stylesheet on this page.")); return; }
      for (const s of this.sheets) {
        if (this.sheets.length > 1) view.append(this.comment(`/* ${s.name} */`));
        if (s.unread) { view.append(this.comment("/* stylesheet could not be read */")); continue; }
        this.render(view, s.nodes, 0);
      }
      this.markHits();
    }

    markHits() {
      // The groups whose rule selects the last pick wear its hue; the others stand as they are
      const el = this.focusEl, hue = el ? this.picks.get(el)?.hue : null;
      for (const { node, el: g } of this.groups || []) {
        let hit = false;
        if (el && node.model) hit = this.matchModel(node.model, [el]).length > 0;
        g.classList.toggle("hit", hit);
        if (hit) g.style.setProperty("--accent", `var(--pick-${hue % PALETTE})`); else g.style.removeProperty("--accent");
      }
    }

    scrollToHit() {
      // Brings the pick's own rule into view: the first lit group past the universal resets, else the first lit one
      const hits = (this.groups || []).filter((x) => x.el.classList.contains("hit"));
      const first = (hits.find((x) => !/^\*/.test(x.node.model.selector || "")) || hits[0])?.el;
      if (!first) return;
      const body = this.body.getBoundingClientRect();
      this.body.scrollTop += first.getBoundingClientRect().top - body.top - 8;
    }

    note(text) {
      const n = document.createElement("div");
      n.className = "empty";
      n.textContent = text;
      return n;
    }

    group(n, opts = {}) {
      // One rule: its selector over its declaration rows
      const g = document.createElement("div");
      g.className = "grp";
      g.dataset.depth = opts.depth || 0;
      const head = document.createElement("div");
      head.className = "gh";
      head.append(this.span("sel", n.head));
      if (n.model?.nativeFallback) head.title = "Live CSSOM values; source text differs or contains nested declarations.";
      g.append(head);
      for (const d of n.decls) {
        if (d.type === "blank") continue;
        if (d.type === "comment") { g.append(this.comment(d.text)); continue; }
        g.append(this.declNode(d));
      }
      this.groups.push({ node: n, el: g });
      if (n.children?.length) this.render(g, n.children, (opts.depth || 0) + 1);
      return g;
    }

    comment(text) {
      const c = document.createElement("div");
      c.className = "cm";
      c.textContent = text;
      return c;
    }

    render(out, nodes, depth) {
      for (const n of nodes) {
        switch (n.type) {
          case "blank": break;
          case "comment": out.append(this.comment(n.text)); break;
          case "flat": out.append(this.comment(n.text)); break;
          case "opaque": out.append(this.comment(`${n.head} { … }`)); break;
          case "group": {
            const head = document.createElement("div");
            head.className = "gh";
            head.append(this.span("sel", n.head));
            out.append(head);
            this.render(out, n.children, depth + 1);
            break;
          }
          case "rule": out.append(this.group(n, { depth })); break;
        }
      }
    }

    declNode(d) {
      const row = document.createElement("div");
      row.className = "d";
      const text = `${d.prop}: ${d.value}${d.important ? " !important" : ""}`;
      // A declaration the browser did not accept (or a rule the CSSOM could not pair) cannot be toggled
      if (!d.live) {
        row.classList.add("na");
        row.title = "This declaration is unsupported or read-only";
        row.append(this.span("t", text));
        return row;
      }
      const box = document.createElement("input");
      box.type = "checkbox";
      box.checked = d.on;
      box.setAttribute("aria-label", `${d.prop}: ${d.value}`);
      box.addEventListener("change", () => { d.on = box.checked; this.apply(d); this.syncRow(d); });
      const show = document.createElement("button");
      show.type = "button";
      show.className = "t";
      show.textContent = `${d.prop}: `;
      show.setAttribute("aria-pressed", String(this.pins.has(d)));
      show.title = `Show where ${d.model.selector || d.model.head} lands`;
      show.addEventListener("click", () => {
        const on = !this.pins.has(d);
        if (on) this.pins.add(d); else this.pins.delete(d);
        show.setAttribute("aria-pressed", String(on));
        row.classList.toggle("on", on);
        this.paint();
      });
      const sw = document.createElement("span");
      sw.className = "sw";
      const value = this.span("v", d.value);
      value.tabIndex = 0;
      value.setAttribute("role", "button");
      value.title = "Click to change the value";
      value.addEventListener("click", () => this.edit(d));
      value.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.edit(d); } });
      row.addEventListener("pointerenter", () => { this.hover = d; this.paint(); });
      row.addEventListener("pointerleave", () => { this.hover = null; this.paint(); });
      row.append(box, show, sw, value, this.span("x", d.important ? "!important" : ""));
      row.classList.toggle("on", this.pins.has(d));
      this.rowOf.set(d, { row, box, value, sw });
      this.syncRow(d);
      return row;
    }

    syncRow(d) {
      // Paints a declaration's row from its state: tick, value, swatch, edited and off looks
      const r = this.rowOf.get(d);
      if (!r) return;
      r.box.checked = d.on;
      r.box.setAttribute("aria-label", `${d.prop}: ${d.value}`);
      r.value.textContent = d.value;
      r.row.classList.toggle("off", !d.on);
      r.row.classList.toggle("edited", d.value !== d.orig);
      const color = isColor(d.prop, d.value);
      r.sw.hidden = !color;
      if (color) r.sw.style.background = d.value;
    }

    edit(d) {
      // Swaps the value for a text field: every keystroke is tried on the page, arrows step the first number,
      // Enter or leaving keeps it, Escape puts back what was there when the field opened
      if (this.editor && !this.editor.finish(false)) return;
      const r = this.rowOf.get(d);
      if (!r) return;
      const { value } = r;
      const start = d.value, startOn = d.on;
      const model = d.model, startText = model.rule.style.cssText;
      const startAttribute = model.inlineEl?.getAttribute("style") ?? null;
      const cancelStyle = this.scratch(model, startText);
      let editorWrite = startText;
      const absorbOutside = () => {
        const live = model.rule.style.cssText;
        for (const { prop, value, priority } of this.styleChanges(this.scratch(model, editorWrite), this.scratch(model, live))) {
          this.writeProperty(cancelStyle, prop, value, priority);
        }
        editorWrite = live;
      };
      const field = document.createElement("input");
      field.type = "text";
      field.className = "ed";
      field.value = d.value;
      field.setAttribute("aria-label", `${d.prop} value`);
      field.autocomplete = "off";
      field.spellcheck = false;
      const size = () => { field.style.inlineSize = `calc(${Math.max(field.value.length, 1) + 1}ch + 12px)`; };
      const validate = () => {
        absorbOutside();
        const valid = this.change(d, field.value);
        if (valid) editorWrite = model.rule.style.cssText;
        field.setAttribute("aria-invalid", String(!valid));
        field.setCustomValidity(valid ? "" : "Enter a valid CSS value.");
        this.status.textContent = valid ? "" : "Invalid CSS value. Correct it, or press Escape to cancel.";
        return valid;
      };
      const set = (v) => { field.value = v; size(); return validate(); };
      field.addEventListener("input", () => { size(); validate(); });
      field.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); finish(false, true); }
        else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); finish(true, true); } // the panel's own Escape must not fire
        else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          const m = field.value.match(/-?\d*\.?\d+/);
          if (!m) return;
          e.preventDefault();
          const step = (e.key === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 10 : e.altKey ? 0.1 : 1);
          const n = Math.round((parseFloat(m[0]) + step) * 1000) / 1000;
          set(field.value.slice(0, m.index) + n + field.value.slice(m.index + m[0].length));
        }
      });
      let finished = false;
      const finish = (cancel, restoreFocus = false) => {
        if (finished) return true;
        if (!cancel && !validate()) {
          if (restoreFocus) field.focus();
          return false;
        }
        finished = true;
        if (cancel) {
          absorbOutside();
          this.rebaseBaseline(model);
          if (model.inlineEl && cancelStyle.cssText === startText) {
            if (startAttribute == null) model.inlineEl.removeAttribute("style");
            else model.inlineEl.setAttribute("style", startAttribute);
          } else model.rule.style.cssText = cancelStyle.cssText;
          d.value = start; d.on = startOn;
          const originally = this.scratch(model, startText);
          if (startOn && (originally.getPropertyValue(d.prop) !== cancelStyle.getPropertyValue(d.prop) || originally.getPropertyPriority(d.prop) !== cancelStyle.getPropertyPriority(d.prop))) {
            d.value = cancelStyle.getPropertyValue(d.prop) || start;
            d.on = cancelStyle.getPropertyValue(d.prop) !== "";
            d.important = cancelStyle.getPropertyPriority(d.prop) === "important";
          }
          model.sourceText = this.scratch(model, this.declarationText(model)).cssText;
          model.lastApplied = model.rule.style.cssText;
          this.queueLoad(); this.markHits(); this.paint();
        }
        this.status.textContent = "";
        field.replaceWith(value);
        this.syncRow(d);
        if (this.editor?.field === field) this.editor = null;
        if (restoreFocus) value.focus();
        if (this.pendingCssRender) { this.pendingCssRender = false; this.renderCss(); if (restoreFocus) this.rowOf.get(d)?.value.focus(); }
        return true;
      };
      this.editor = { field, finish, declaration: d };
      field.addEventListener("blur", () => finish(false));

      size();
      value.replaceWith(field);
      field.focus();
      field.select();
    }

    scratch(model, text = "") {
      let style;
      if (/^@(?:font-face|page)\b/.test(model.head)) {
        const sheet = new CSSStyleSheet(); sheet.replaceSync(`${model.head} {}`); style = sheet.cssRules[0].style;
      } else style = document.createElement("div").style;
      style.cssText = text; return style;
    }

    declarationText(model) {
      return model.decls.filter((d) => d.type === "decl" && d.on)
        .map((d) => `${d.prop}: ${d.value}${d.important ? " !important" : ""};`).join("\n");
    }

    styleChanges(before, after) {
      return [...new Set([...before, ...after])].filter((prop) =>
        before.getPropertyValue(prop) !== after.getPropertyValue(prop) || before.getPropertyPriority(prop) !== after.getPropertyPriority(prop)
      ).map((prop) => ({ prop, value: after.getPropertyValue(prop), priority: after.getPropertyPriority(prop) }));
    }

    writeProperty(style, prop, value, priority) {
      if (value === "") style.removeProperty(prop);
      else style.setProperty(prop, value, priority);
    }

    rebaseBaseline(model, live = model.rule.style.cssText) {
      // Preserve changes made by the page since our last write, including deletions.
      if (live === model.lastApplied) return;
      const baseline = this.scratch(model, model.baseline);
      for (const { prop, value, priority } of this.styleChanges(this.scratch(model, model.lastApplied), this.scratch(model, live))) {
        this.writeProperty(baseline, prop, value, priority);
      }
      model.baseline = baseline.cssText;
      if (model.inlineEl) model.originalAttribute = !model.inlineEl.hasAttribute("style") && !model.baseline ? null : model.baseline;
    }

    reconcileModel(model) {
      const live = model.rule.style.cssText;
      if (this.dirtyModels.has(model)) this.rebaseBaseline(model, live);
      else {
        model.baseline = live;
        model.originalAttribute = model.inlineEl?.getAttribute("style") ?? null;
      }
      const old = model.decls.filter((d) => d.type === "decl"), used = new Set();
      const baseline = this.scratch(model, model.baseline);
      model.decls = parseDecls(live, 0, live.length).map((entry) => {
        if (entry.type !== "decl") return entry;
        const d = old.find((candidate) => candidate.prop === entry.prop && candidate.on && !used.has(candidate)) || { model, rule: model.rule };
        used.add(d);
        Object.assign(d, entry, { orig: baseline.getPropertyValue(entry.prop), live: true, on: true });
        return d;
      });
      // Disabled declarations remain available for re-enabling and Reset.
      for (const d of old) if (!used.has(d)) {
        if (this.pins.has(d) || this.editor?.declaration === d || !d.on) {
          d.on = false;
          d.orig = baseline.getPropertyValue(d.prop) || d.orig;
          model.decls.push(d);
        } else if (this.hover === d) this.hover = null;
      }
      model.nativeFallback = true;
      model.sourceText = live;
      model.lastApplied = live;
    }

    validValue(d, value) {
      const scratch = this.scratch(d.model);
      scratch.setProperty(d.prop, value, d.important ? "important" : "");
      return [...scratch].length > 0 && scratch.getPropertyValue(d.prop) !== "";
    }

    change(d, value) {
      value = value.trim();
      if (!value || !this.validValue(d, value)) return false;
      d.value = value; d.on = true; this.apply(d); return true;
    }

    apply(d) {
      const model = d.model;
      const style = model.rule.style;
      if (!this.dirtyModels.has(model)) {
        model.baseline = style.cssText;
        if (model.inlineEl) model.originalAttribute = model.inlineEl.getAttribute("style");
      } else this.rebaseBaseline(model);
      const proposed = this.scratch(model, this.declarationText(model));
      const previous = this.scratch(model, model.sourceText);
      const touched = this.scratch(model);
      touched.setProperty(d.prop, d.value, d.important ? "important" : "");
      const changed = new Set([...this.styleChanges(previous, proposed).map((entry) => entry.prop), ...touched]);
      // Apply only this edit's property changes; unrelated live declarations stay intact.
      for (const prop of changed) this.writeProperty(style, prop, proposed.getPropertyValue(prop), proposed.getPropertyPriority(prop));
      this.dirtyModels.add(model);
      model.sourceText = proposed.cssText;
      model.lastApplied = style.cssText;
      for (const entry of model.decls) if (entry.type === "decl") this.syncRow(entry);
      this.markHits(); this.paint();
    }


    resetAll() {
      // The head's Reset: the page's CSS back, every pick and pin cleared, the picker off
      this.editor?.finish(true);
      this.setPicking(false);
      this.reset();
      for (const [, p] of this.picks) { this.setPickedRow(p.row, false); p.row.style.removeProperty("--accent"); }
      this.picks.clear();
      this.focusEl = null;
      this.pins.clear();
      this.hover = null;
      this.markHits();
      for (const r of this.rowOf.values()) { r.row.classList.remove("on"); r.row.querySelector(".t")?.setAttribute("aria-pressed", "false"); }
      this.paint();
    }

    reset() {
      for (const model of this.dirtyModels) {
        this.rebaseBaseline(model);
        if (model.inlineEl && model.originalAttribute == null) model.inlineEl.removeAttribute("style");
        else if (model.inlineEl) model.inlineEl.setAttribute("style", model.originalAttribute);
        else model.rule.style.cssText = model.baseline;
        for (const d of model.decls) if (d.type === "decl") {
          d.value = d.orig; d.on = true; this.syncRow(d);
        }
        model.lastApplied = model.rule.style.cssText;
        model.sourceText = model.lastApplied;
      }
      this.dirtyModels.clear();
      this.queueLoad();
      this.paint();
    }


  }

  customElements.define("fm-inspector", Inspector);
  const mount = () => { if (!document.querySelector("fm-inspector")) document.body.append(document.createElement("fm-inspector")); };
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount, { once: true });
})();
