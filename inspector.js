// inspector.js v0.1.76

(() => {
  // src/style.css
  var style_default = `  :host {
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
    --bord: rgba(234, 179, 8, 0.28);
    --bord-ink: #ca8a04;
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
  :host([folded]) .body, :host([folded]) .status, :host([folded]) .rz { display: none; }
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
  .sizebtn { inline-size: 24px; block-size: 24px; display: inline-flex; align-items: center; justify-content: center; color: var(--muted); border-radius: 8px; margin-inline-start: 2px; }
  .sizebtn:hover { color: var(--text); background: var(--bg-2); }
  .sizebtn[aria-pressed="true"] { color: var(--accent); background: var(--wash); }
  .sizebtn svg { inline-size: 16px; block-size: 16px; }
  /* the resize tool's own small bar at the top centre of the page: the chosen element's size, undo the last resize, that element back, every resized element back */
  .sizetools { position: fixed; inset-block-start: 8px; inset-inline-start: 50%; transform: translateX(-50%); z-index: 2; display: none; align-items: center; gap: 2px; padding: 3px 3px 3px 10px; font-family: var(--mono); font-size: 11px; color: var(--text); background: var(--bg); border: 1px solid var(--border); border-radius: 999px; box-shadow: var(--shadow); white-space: nowrap; }
  :host([sizing]) .sizetools { display: inline-flex; }
  .sizetools { max-inline-size: calc(100vw - 16px); }
  .sizetools .wval { color: var(--accent); font-weight: 700; margin-inline-end: 6px; min-inline-size: 0; max-inline-size: min(300px, 30vw); overflow: hidden; text-overflow: ellipsis; }
  .sizetools .wval:empty::before { content: "Click an element"; color: var(--muted); font-weight: 400; }
  .wblock { position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; } /* the reason a resize was held, for assistive tech only: on screen the held row's red in the CSS tab says it (the badge left on Alper's call) */
  /* the declaration that kept a resize from landing: a red row, its name and value in red */
  .d.block { background: color-mix(in srgb, var(--dist) 14%, transparent); box-shadow: inset 3px 0 0 var(--dist), inset 0 0 0 1px color-mix(in srgb, var(--dist) 50%, transparent); }
  .d.block .t, .d.block .v, .d.block .x { color: var(--dist); font-weight: 700; }
  .grp:has(.d.block) .gh .sel { color: var(--dist); }
  .sundo { inline-size: 22px; block-size: 22px; display: inline-flex; align-items: center; justify-content: center; color: var(--muted); border-radius: 999px; }
  .sundo svg { inline-size: 14px; block-size: 14px; }
  .sundo:hover, .sreset:hover { color: var(--text); background: var(--bg-2); }
  .sundo:disabled { opacity: 0.35; cursor: default; background: none; }
  .sreset, .rreset { block-size: 22px; padding: 0 8px; font-size: 11px; font-weight: 600; color: var(--muted); border-radius: 999px; }
  .rreset:hover { color: var(--text); background: var(--bg-2); }
  .hd { position: fixed; z-index: 2; display: none; inline-size: 32px; block-size: 32px; margin: -16px 0 0 -16px; padding: 0; background: transparent; border: 0; border-radius: 4px; cursor: ew-resize; touch-action: none; } /* a button: Left/Right arrows step the width */
  .hd::after { content: ""; position: absolute; inset: 8px; background: var(--accent); border: 2px solid #fff; border-radius: 4px; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3); }
  .hd:disabled { cursor: not-allowed; opacity: 0.5; }
  :host([sizing]) .hd[data-on] { display: block; }
  /* beside the handle, once the element has been resized: this element back to its own size */
  .hreset { position: fixed; z-index: 2; display: none; block-size: 20px; padding: 0 7px; font-family: var(--mono); font-size: 10px; font-weight: 600; color: var(--muted); background: var(--bg); border: 1px solid var(--border); border-radius: 999px; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18); }
  .hreset:hover { color: var(--text); background: var(--bg-2); }
  :host([sizing]) .hreset[data-on] { display: inline-flex; align-items: center; }
  .measure { inline-size: 24px; block-size: 24px; display: inline-flex; align-items: center; justify-content: center; color: var(--muted); border-radius: 8px; margin-inline-start: 4px; }
  .measure:hover { color: var(--text); background: var(--bg-2); }
  .measure[aria-pressed="true"] { color: var(--accent); background: var(--wash); }
  .measure svg { inline-size: 16px; block-size: 16px; }
  [role="tablist"] { display: flex; flex: none; } /* the tabs stay on one line however narrow the panel gets */
  .head > * { flex: none; }
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
  .spacer { flex: 1 1 0; min-inline-size: 0; }
  .theme { inline-size: 24px; block-size: 24px; display: inline-flex; align-items: center; justify-content: center; color: var(--muted); border-radius: 8px; }
  .theme:hover { color: var(--text); background: var(--bg-2); }
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
  .undo { inline-size: 24px; block-size: 24px; display: inline-flex; align-items: center; justify-content: center; color: var(--muted); border-radius: 8px; }
  .undo:hover { color: var(--text); background: var(--bg-2); }
  .undo:disabled { opacity: 0.35; cursor: default; background: none; }
  .undo svg { inline-size: 16px; block-size: 16px; }
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
  .caret::before { content: "▾"; }
  .row[data-folded] .caret::before { content: "▸"; }
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
  .grp.inline { --sel: var(--flex); border-inline-start: 3px solid var(--flex); margin-block: 4px; } /* an element's own style="": the inspector's resizes land here */
  .grp.inline .gh .sel { color: var(--flex); }
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
  .d.auto { background: color-mix(in srgb, var(--flex) 7%, transparent); } /* a line the resize tool wrote: a light tint, the inline group's amber */
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
  .pick-surface { display: none; position: fixed; inset: 0; z-index: 1; cursor: crosshair; touch-action: pan-x pan-y pinch-zoom; } /* a transparent shield over the page: it takes the pointer input, the page never does; pans still scroll */
  :host([picking]) .pick-surface, :host([sizing]) .pick-surface { display: block; }
  .ov div { position: fixed; }
  .ov .pick { position: static; }
  .box { border: 1.5px solid var(--accent); border-radius: 2px; }
  .probe .box { border-color: #2563eb; }
  .pd, .mr, .bd { border-style: solid; border-color: var(--pad); }
  .bd { border-color: var(--bord); }
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
  .lb.hold { background: var(--dist); color: #fff; font-weight: 700; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18); } /* the resize tool: the area that held the drag, with the reason */
  .lb.dch { padding: 3px 6px; border-radius: 4px; font-weight: 700; color: #fff; box-shadow: none; background: var(--dist); transform: translate(-50%, -50%); }
  .lb.pv { background: var(--pad-ink); color: #fff; padding: 2px 4px; font-size: 10px; transform: translate(-50%, -50%); }
  .lb.mv { background: var(--mar-ink); color: #fff; padding: 2px 4px; font-size: 10px; transform: translate(-50%, -50%); }
  .lb.bv { background: var(--bord-ink); color: #fff; padding: 2px 4px; font-size: 10px; transform: translate(-50%, -50%); }
  .lb.sz { transform: translate(-50%, -50%); padding: 3px 6px; border-radius: 4px; font-weight: 700; background: var(--accent); color: #fff; box-shadow: none; }
  .dbox { border: 1.5px dashed var(--dist); border-radius: 2px; }
  .free { background: repeating-linear-gradient(-45deg, rgba(100, 116, 139, 0.22) 0 3px, transparent 3px 9px); border: 1px dashed rgba(100, 116, 139, 0.55); } /* the ruler: room a box leaves unused beside itself */
  .lb.fv { background: #64748b; color: #fff; padding: 2px 5px; font-size: 10px; transform: translate(-50%, -50%); box-shadow: none; }
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
  :host([picking]) .state, :host([sizing]) .state { display: inline-flex; }

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
    .head button { touch-action: none; } /* a pull that starts on a tab is still a pull */
    .body { min-block-size: 0; }
    .head::before { content: ""; position: absolute; inset-block-start: 5px; inset-inline-start: 50%; inline-size: 36px; block-size: 4px; margin-inline-start: -18px; border-radius: 999px; background: var(--border); }
    .tab { padding: 0 6px; font-size: 12px; }
    .view { font-size: 11px; }
    .state { inset-block-end: auto; inset-block-start: 8px; font-size: 12px; padding: 6px 12px; }
    :host([sizing]) .state { inset-block-start: 44px; } /* under the resize tool's own bar */
  }
  @media (pointer: coarse) {
    .hd { inline-size: 44px; block-size: 44px; margin: -22px 0 0 -22px; }
    .hd::after { inset: 14px; }
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

  // src/markup.js
  var ICON_PICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6"/><path d="m12 12 4 10 1.7-4.3L22 16Z"/></svg>';
  var ICON_RULER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2.42 12.713c-.136-.215-.204-.323-.242-.49a1.173 1.173 0 0 1 0-.446c.038-.167.106-.274.242-.49C3.546 9.505 6.895 5 12 5s8.455 4.505 9.58 6.287c.137.215.205.323.243.49.029.125.029.322 0 .446-.038.167-.106.274-.242.49C20.455 14.495 17.105 19 12 19c-5.106 0-8.455-4.505-9.58-6.287Z"/><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"/></svg>';
  var ICON_SIZE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>';
  var ICON_SUN = '<svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
  var ICON_MOON = '<svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>';
  var ICON_UNDO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h10a6 6 0 0 1 0 12H4M4 7l4-4M4 7l4 4"/></svg>';
  var ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
  var MARKUP = `
  <div class="ov" aria-hidden="true"></div>
  <div class="pick-surface" aria-hidden="true"></div>
  <div class="state" aria-hidden="true">Select an element · Esc to cancel</div>
  <button type="button" class="hd" aria-label="Adjust the element's width" title="Drag sideways, or Left/Right arrows (Shift: 10px)"></button>
  <button type="button" class="hreset" title="This element back to its own size, every CSS edit back">Reset</button>
  <div class="wblock" role="status"></div>
  <div class="sizetools" role="group" aria-label="Resize tool"><span class="wval"></span><button type="button" class="sundo" aria-label="Undo the last resize" title="Undo the last resize" disabled>${ICON_UNDO}</button><button type="button" class="sreset" title="Every resized element back to its own size">Reset sizes</button><button type="button" class="rreset" title="Every CSS edit in the panel back">Reset rules</button></div>
  <div class="launcher"><button class="fab" type="button" aria-expanded="false" aria-controls="panel">Show code</button>
  <button class="bye" type="button" aria-label="Remove the code inspector" title="Remove until the next page load">${ICON_X}</button></div>
  <section class="panel" id="panel" aria-label="Code">
    <div class="head">
      <button class="pickbtn" type="button" aria-pressed="false" aria-label="Select an element on the page" title="Select an element on the page">${ICON_PICK}</button>
      <div role="tablist" aria-label="Code views">
        <button class="tab" type="button" role="tab" id="tab-html" tabindex="0" aria-selected="true" aria-controls="view-html">HTML</button>
        <button class="tab" type="button" role="tab" id="tab-css" tabindex="-1" aria-selected="false" aria-controls="view-css">CSS</button>
      </div>
      <button class="sizebtn" type="button" aria-pressed="false" aria-label="Resize an element" title="Resize an element: click one on the page, then drag its handles">${ICON_SIZE}</button>
      <button class="measure" type="button" aria-pressed="false" aria-label="Show all sizes" title="Show all sizes: every element's size, padding, margin and border">${ICON_RULER}</button>
      <span class="spacer"></span>
      <button class="theme" type="button" aria-label="Switch the inspector's theme" title="Light / dark">${ICON_SUN}${ICON_MOON}</button>
      <button class="undo" type="button" aria-label="Undo the last CSS change" title="Undo the last change" disabled>${ICON_UNDO}</button>
      <button class="reset" type="button" title="Page CSS back, picks and pins cleared">Reset</button>
      <button class="close" type="button" aria-label="Hide code">${ICON_X}</button>
    </div>
    <div class="status" role="status" aria-live="polite"></div>
    <div class="body">
      <div class="view" id="view-html" role="tabpanel" aria-labelledby="tab-html"></div>
      <div class="view" id="view-css" role="tabpanel" aria-labelledby="tab-css" hidden></div>
    </div>
  </section>
  ${["n", "s", "e", "w", "ne", "nw", "se", "sw"].map((e) => `<div class="rz ${e}" data-edge="${e}" aria-hidden="true"></div>`).join("")}`;

  // src/util.js
  var VOID = /* @__PURE__ */ new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"]);
  var squash = (s) => s.replace(/\s+/g, " ").trim();
  var num = (v) => parseFloat(v) || 0;
  var fmt = (n) => String(Math.round(n * 100) / 100);
  var camel = (p) => p.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  var name = (el) => el.localName + (el.id ? `#${el.id}` : "") + (el.classList.length ? "." + [...el.classList].join(".") : "");
  var PALETTE = 5;
  var TRUNC = 24;
  var COLORISH = /^(color|background(-color)?|border(-.*)?-color|outline-color|fill|stroke|caret-color|accent-color|text-decoration-color|column-rule-color)$/;
  var isColor = (prop, v) => COLORISH.test(prop) && CSS.supports("color", v);
  function sides(prop, cs = { writingMode: "horizontal-tb", direction: "ltr" }) {
    const m = prop.match(/^(padding|margin)(?:-(top|right|bottom|left|inline|block))?(?:-(start|end))?$/);
    if (!m) return null;
    const [, kind, part, half] = m;
    let s = { t: 1, r: 1, b: 1, l: 1 };
    if (part === "top") s = { t: 1 };
    else if (part === "right") s = { r: 1 };
    else if (part === "bottom") s = { b: 1 };
    else if (part === "left") s = { l: 1 };
    else if (part === "inline" || part === "block") {
      const vertical = /^(vertical|sideways)/.test(cs.writingMode);
      const rtl = cs.direction === "rtl";
      const reversed = cs.writingMode === "sideways-lr";
      const inline = vertical ? rtl !== reversed ? ["b", "t"] : ["t", "b"] : rtl ? ["r", "l"] : ["l", "r"];
      const block = vertical ? /-(rl)$/.test(cs.writingMode) ? ["r", "l"] : ["l", "r"] : ["t", "b"];
      const pair = part === "inline" ? inline : block;
      s = half ? { [pair[half === "start" ? 0 : 1]]: 1 } : { [pair[0]]: 1, [pair[1]]: 1 };
    }
    return { kind, sides: s };
  }
  var SIZE = /^(min-|max-)?(inline-size|block-size|width|height)$/;
  function span(cls, text) {
    const s = document.createElement("span");
    s.className = cls;
    s.textContent = text;
    return s;
  }

  // src/overlay/painter.js
  var Painter = class {
    constructor(ov) {
      this.ov = ov;
      this.into = null;
      this.placed = [];
      this.rectCache = null;
      this.geometryCache = null;
    }
    begin() {
      this.rectCache = /* @__PURE__ */ new Map();
      this.geometryCache = /* @__PURE__ */ new Map();
      this.ov.replaceChildren();
      this.placed = [];
    }
    end() {
      this.into = null;
      this.rectCache = null;
      this.geometryCache = null;
    }
    group(cls, accent) {
      const group = document.createElement("div");
      group.className = cls;
      if (accent) group.style.setProperty("--accent", accent);
      this.ov.append(group);
      this.into = group;
      return group;
    }
    rect(el) {
      if (this.rectCache?.has(el)) return this.rectCache.get(el);
      const r = el.getBoundingClientRect();
      this.rectCache?.set(el, r);
      return r;
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
      if (typeof text === "string") n.textContent = text;
      else n.append(...text);
      n.style.cssText = `left:${x}px;top:${y}px`;
      (this.into || this.ov).append(n);
      return n;
    }
    geometry(el) {
      if (this.geometryCache?.has(el)) return this.geometryCache.get(el);
      const r = this.rect(el), cs = getComputedStyle(el);
      const side = (p) => ({ t: num(cs[`${p}Top`]), r: num(cs[`${p}Right`]), b: num(cs[`${p}Bottom`]), l: num(cs[`${p}Left`]) });
      const b = { t: num(cs.borderTopWidth), r: num(cs.borderRightWidth), b: num(cs.borderBottomWidth), l: num(cs.borderLeftWidth) };
      const result = { r, cs, p: side("padding"), m: side("margin"), b };
      this.geometryCache?.set(el, result);
      return result;
    }
    ring(cls, r, s, only, labelCls) {
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
      const parts = [span("n", name(el))];
      if (size) parts.push(span("bar", "|"), span("", `${fmt(r.width)} × ${fmt(r.height)}px`));
      const d = this.geometry(el).cs.display;
      if (/flex|grid/.test(d)) parts.push(span("fx", d.replace("inline-", "")));
      return parts;
    }
    dims(r, chrome) {
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
    chip(label, r, chrome) {
      const h = label.getBoundingClientRect().height;
      const spots = [];
      if (r.top - h - 8 >= 0) spots.push([r.left, r.top - h - 8]);
      if (r.bottom + h + 8 <= innerHeight) spots.push([r.left, r.bottom + 8]);
      spots.push([r.left + 8, r.top + 8], [r.right + 8, r.top], [r.left - label.getBoundingClientRect().width - 8, r.top]);
      const hits = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      for (const [x, y] of spots) {
        label.style.left = `${Math.max(x, 0)}px`;
        label.style.top = `${y}px`;
        this.clamp(label);
        const b = label.getBoundingClientRect();
        if (!hits(b, chrome) && !this.placed.some((p) => hits(b, p))) {
          this.placed.push(b);
          return;
        }
      }
      label.remove();
    }
    fix(label) {
      this.clamp(label);
      this.placed.push(label.getBoundingClientRect());
      return label;
    }
    clamp(label) {
      const b = label.getBoundingClientRect();
      let dx = 0, dy = 0;
      if (b.left < 4) dx = 4 - b.left;
      else if (b.right > innerWidth - 4) dx = innerWidth - 4 - b.right;
      if (b.top < 4) dy = 4 - b.top;
      else if (b.bottom > innerHeight - 4) dy = innerHeight - 4 - b.bottom;
      if (dx) label.style.left = `${num(label.style.left) + dx}px`;
      if (dy) label.style.top = `${num(label.style.top) + dy}px`;
    }
    beside(r, chrome) {
      if (innerWidth - r.right < 90) return false;
      return !(r.right + 10 < chrome.right && r.right + 90 > chrome.left && r.top < chrome.bottom && r.bottom > chrome.top);
    }
    place(label, side, from, to, chrome) {
      const set = (mid2) => {
        label.style[side] = `${mid2}px`;
      };
      const hits = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      const free = () => {
        const b = label.getBoundingClientRect();
        return !hits(b, chrome) && !this.placed.some((p) => hits(b, p));
      };
      const mid = (from + to) / 2;
      set(mid);
      if (!free()) {
        const b = label.getBoundingClientRect();
        const size = side === "left" ? b.width : b.height, step = size * 0.6 + 4;
        const span2 = Math.max((to - from) / 2 - size / 2, 0);
        let found = false;
        for (let k = 1; k * step <= span2 && !found; k++) {
          for (const dir of [1, -1]) {
            set(mid + dir * k * step);
            if (free()) {
              found = true;
              break;
            }
          }
        }
        if (!found) {
          set(mid);
          const cross = side === "left" ? "top" : "left", thick = (side === "left" ? b.height : b.width) + 4;
          const base = num(label.style[cross]);
          for (let k = 1; k <= 4 && !found; k++) {
            for (const dir of [-1, 1]) {
              label.style[cross] = `${base + dir * k * thick}px`;
              if (free()) {
                found = true;
                break;
              }
            }
          }
          if (!found) label.style[cross] = `${base}px`;
        }
      }
      this.fix(label);
    }
  };

  // src/css/parse.js
  var CONDITIONAL = /^@(media|supports|layer|container|scope)\b/;
  function parseBlock(src, pos, end, lines) {
    const nodes = [];
    let i = pos;
    const ws = () => {
      let nl = 0;
      while (i < end && /\s/.test(src[i])) {
        if (src[i] === "\n") nl++;
        i++;
      }
      if (nl > 1 && nodes.length) nodes.push({ type: "blank" });
    };
    while (i < end) {
      ws();
      if (i >= end) break;
      if (src[i] === "}") {
        i++;
        break;
      }
      if (src.startsWith("/*", i)) {
        const close = src.indexOf("*/", i + 2);
        const stop = close === -1 ? end : close + 2;
        nodes.push({ type: "comment", text: src.slice(i, stop) });
        i = stop;
        continue;
      }
      const brace = scanTo(src, i, end, "{;");
      if (brace === -1 || brace >= end) {
        nodes.push({ type: "comment", text: src.slice(i, end).trim() });
        i = end;
        break;
      }
      const head = src.slice(i, brace).trim();
      const line = lines(i);
      if (src[brace] === ";") {
        nodes.push({ type: "flat", text: head + ";" });
        i = brace + 1;
        continue;
      }
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
      if (quote) {
        if (ch === "\\") i++;
        else if (ch === quote) quote = null;
        continue;
      }
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === '"' || ch === "'") {
        quote = ch;
        continue;
      }
      if (src.startsWith("/*", i)) {
        const c = src.indexOf("*/", i + 2);
        i = c < 0 ? end : c + 1;
        continue;
      }
      if (!parens && !brackets && !braces && stops.includes(ch)) return i;
      if (ch === "(") parens++;
      else if (ch === ")") parens = Math.max(0, parens - 1);
      else if (ch === "[") brackets++;
      else if (ch === "]") brackets = Math.max(0, brackets - 1);
      else if (ch === "{") braces++;
      else if (ch === "}") braces = Math.max(0, braces - 1);
    }
    return -1;
  }
  function matchBrace(src, open, end) {
    let depth = 0, q = null;
    for (let i = open; i < end; i++) {
      const ch = src[i];
      if (q) {
        if (ch === "\\") i++;
        else if (ch === q) q = null;
        continue;
      }
      if (ch === "\\") {
        i++;
        continue;
      }
      if (ch === '"' || ch === "'") {
        q = ch;
        continue;
      }
      if (src.startsWith("/*", i)) {
        const c = src.indexOf("*/", i + 2);
        i = c === -1 ? end : c + 1;
        continue;
      }
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
        const close = src.indexOf("*/", i + 2), stop2 = close < 0 ? end : Math.min(end, close + 2);
        items.push({ type: "comment", text: src.slice(i, stop2) });
        i = stop2;
        continue;
      }
      let stop = scanTo(src, i, end, ";{");
      if (stop >= 0 && src[stop] === "{") {
        const prefix = src.slice(i, stop), colon2 = scanTo(prefix, 0, prefix.length, ":");
        if (colon2 < 0 || !/^--/.test(prefix.slice(0, colon2).trim())) {
          i = Math.min(end, matchBrace(src, stop, end) + 1);
          continue;
        }
        stop = scanTo(src, i, end, ";");
      }
      const raw = src.slice(i, stop < 0 ? end : stop).trim();
      i = stop < 0 ? end : stop + 1;
      const colon = scanTo(raw, 0, raw.length, ":");
      if (colon < 0) {
        if (raw) items.push({ type: "comment", text: raw });
        continue;
      }
      let prop = raw.slice(0, colon).trim(), value = raw.slice(colon + 1).trim();
      if (!prop.startsWith("--")) prop = prop.toLowerCase();
      const priority = /!\s*(?:\/\*[\s\S]*?\*\/\s*)*important\s*$/i;
      const important = priority.test(value);
      if (important) value = value.replace(priority, "").trimEnd();
      items.push({ type: "decl", prop, value, important, on: true });
    }
    return items;
  }
  var headerCache = /* @__PURE__ */ new Map();
  var norm = (text) => text.trim();
  function ruleHead(rule) {
    if (typeof rule.selectorText === "string") return rule.selectorText;
    const at = scanTo(rule.cssText, 0, rule.cssText.length, "{");
    return (at < 0 ? rule.cssText : rule.cssText.slice(0, at)).trim();
  }
  function canonicalHead(head) {
    if (headerCache.has(head)) return headerCache.get(head);
    let result = head.trim();
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(`${head} {}`);
      result = sheet.cssRules.length ? ruleHead(sheet.cssRules[0]) : null;
    } catch {
    }
    if (headerCache.size > 2e3) headerCache.clear();
    headerCache.set(head, result);
    return result;
  }
  function link(nodes, cssRules, cond = []) {
    let cursor = 0;
    const rules = Array.from(cssRules), byHead = /* @__PURE__ */ new Map();
    rules.forEach((rule, index) => {
      const key = norm(ruleHead(rule));
      if (!byHead.has(key)) byHead.set(key, []);
      byHead.get(key).push(index);
    });
    for (const n of nodes) {
      if (!["rule", "group", "opaque", "flat"].includes(n.type)) continue;
      const wanted = canonicalHead(n.head || n.text.replace(/;$/, ""));
      if (wanted == null) continue;
      const candidates = byHead.get(wanted) || [];
      let low = 0, high = candidates.length;
      while (low < high) {
        const mid = low + high >>> 1;
        if (candidates[mid] < cursor) low = mid + 1;
        else high = mid;
      }
      const k = candidates[low];
      if (k == null) continue;
      const r = rules[k];
      cursor = k + 1;
      n.cond = cond;
      n.cssRule = r;
      if (n.type === "rule" && r.style) n.rule = r;
      if (n.type === "group" && r.cssRules) link(n.children, r.cssRules, [...cond, n.head]);
    }
  }
  function resolveSelector(child, parent) {
    if (!parent) return child;
    let out = "", quote = null, amp = false;
    for (let i = 0; i < child.length; i++) {
      const ch = child[i];
      if (ch === "\\") {
        out += ch + (child[++i] || "");
        continue;
      }
      if (quote) {
        out += ch;
        if (ch === quote) quote = null;
        continue;
      }
      if (ch === '"' || ch === "'") {
        quote = ch;
        out += ch;
      } else if (ch === "&") {
        out += `:is(${parent})`;
        amp = true;
      } else out += ch;
    }
    return amp ? out : `:is(${parent}) :is(${child})`;
  }

  // src/foreign.js
  var skip = (n) => n.nodeType === 1 && (helper(n) || n.localName === "script" && /inspector\.js/.test(n.getAttribute("src") || "")) || n.nodeType === 8 && /inspector/i.test(n.data) || n.nodeType === 3 && !n.data.trim();
  var KNOWN = /^(immersive-translate|grammarly|adguard|replit-pill)/i;
  var foreignRoots = /* @__PURE__ */ new Set();
  var sourceTops = null;
  var ROOTS = () => [document.documentElement, document.head, document.body];
  var topOf = (el) => {
    let n = el;
    while (n.parentElement && !ROOTS().includes(n.parentElement)) n = n.parentElement;
    return n;
  };
  var markForeign = () => {
    foreignRoots.clear();
    for (const root of ROOTS()) for (const el of root?.children || []) {
      if (ROOTS().includes(el) || /^(fm-inspector|style|link|script|meta|title|base|noscript|template)$/.test(el.localName)) continue;
      const known = KNOWN.test(el.id) || KNOWN.test(el.localName);
      const inSource = !sourceTops || (el.id ? sourceTops.ids.has(el.id) : sourceTops.tags.has(el.localName));
      const extensionLike = !!el.id || el.localName.includes("-") || !!el.shadowRoot;
      if (known || !inSource && extensionLike) foreignRoots.add(el);
    }
  };
  var readSource = async () => {
    try {
      const response = await fetch(location.href, { cache: "force-cache" });
      if (!response.ok) return;
      const doc = new DOMParser().parseFromString(await response.text(), "text/html");
      const tops = [doc.documentElement, doc.head, doc.body].flatMap((root) => [...root.children]).filter((el) => ![doc.head, doc.body].includes(el));
      sourceTops = { tags: new Set(tops.map((el) => el.localName)), ids: new Set(tops.filter((el) => el.id).map((el) => el.id)), styles: new Set([...doc.querySelectorAll("style")].map((el) => el.textContent.trim())) };
    } catch {
    }
    markForeign();
  };
  var helper = (el) => !!el?.closest && (!!el.closest("fm-inspector, [data-fm-inspector-ignore]") || foreignRoots.has(topOf(el)));
  var rendered = (el) => el.isConnected && el.getClientRects().length > 0 && !helper(el);
  var sourceStyles = () => sourceTops?.styles || null;

  // src/css/model.js
  var CssStore = class {
    constructor(ui) {
      this.ui = ui;
      this.models = [];
      this.modelOf = /* @__PURE__ */ new WeakMap();
      this.dirtyModels = /* @__PURE__ */ new Set();
      this.cssSources = /* @__PURE__ */ new WeakMap();
      this.probeName = `--fm-inspector-${Math.random().toString(36).slice(2)}-active`;
      this.sheets = [];
      this.allDecls = [];
      this.inlineNodes = [];
      this.cssState = null;
      this.cssGeneration = 0;
    }
    changed() {
      return !this.sameSnapshot(this.cssState, this.cssSnapshot());
    }
    sourceSheets(repeats = false) {
      const all = [...document.styleSheets, ...document.adoptedStyleSheets || []].filter((sheet) => (!sheet.ownerNode || !this.ui.ownNode(sheet.ownerNode) && !helper(sheet.ownerNode)) && !this.blockerSheet(sheet));
      return repeats ? all : all.filter((sheet, index) => all.lastIndexOf(sheet) === index);
    }
    blockerSheet(sheet) {
      if (sheet.href) return false;
      if (sheet.ownerNode?.localName === "style" && sourceStyles()?.has(sheet.ownerNode.textContent.trim())) return false;
      let rules;
      try {
        rules = [...sheet.cssRules];
      } catch {
        return false;
      }
      const styled = rules.filter((rule) => rule.style);
      if (styled.length < 10 || styled.length < rules.length * 0.9) return false;
      const hiding = styled.filter((rule) => rule.style.length === 1 && rule.style.getPropertyValue("display") === "none" && rule.style.getPropertyPriority("display") === "important");
      if (hiding.length < styled.length * 0.9) return false;
      const listish = hiding.filter((rule) => /\[href|\b(ads?|advert|banner|sponsor|promo|popup|cookie|tracker)\b/i.test(rule.selectorText || ""));
      return listish.length >= hiding.length / 2;
    }
    cssSnapshot() {
      const entries = /* @__PURE__ */ new Map(), order = this.sourceSheets(true);
      const visit = (sheet) => {
        if (entries.has(sheet)) return;
        let rules;
        try {
          rules = [...sheet.cssRules];
        } catch {
          entries.set(sheet, { meta: "unreadable", rules: [] });
          return;
        }
        entries.set(sheet, { meta: `${sheet.disabled}:${sheet.media?.mediaText || ""}`, rules: rules.map((rule) => rule.cssText) });
        for (const rule of rules) if (rule.styleSheet) visit(rule.styleSheet);
      };
      for (const sheet of order) visit(sheet);
      return { order, entries };
    }
    sameSnapshot(a, b) {
      if (!a || a.order.length !== b.order.length || a.order.some((sheet, index) => sheet !== b.order[index])) return false;
      for (const [sheet, entry] of a.entries) {
        const other = b.entries.get(sheet);
        if (!other || other.meta !== entry.meta || other.rules.length !== entry.rules.length || entry.rules.some((text, index) => text !== other.rules[index])) return false;
      }
      return true;
    }
    topRule(model) {
      let rule = model.rule;
      if (model.inlineEl || !rule?.parentStyleSheet) return null;
      while (rule.parentRule) rule = rule.parentRule;
      return rule;
    }
    async load() {
      const generation = this.cssGeneration = (this.cssGeneration || 0) + 1;
      const signal = this.ui.signal();
      const entries = () => this.sourceSheets().map((sheet, index) => {
        let rules;
        try {
          rules = sheet.cssRules;
        } catch {
          rules = null;
        }
        return { sheet, rules, name: sheet.href ? new URL(sheet.href).pathname.split("/").pop() : sheet.ownerNode ? "<style>" : `<adopted stylesheet ${index + 1}>`, text: sheet.ownerNode?.localName === "style" ? sheet.ownerNode.textContent : this.cssSources.get(sheet)?.text ?? null };
      });
      const build = () => {
        this.models = [];
        this.allDecls = [];
        this.sheets = [];
        for (const entry of entries()) {
          if (!entry.rules) {
            this.sheets.push({ name: entry.name, nodes: [], unread: true });
            continue;
          }
          const source = entry.text == null ? [] : parseBlock(entry.text, 0, entry.text.length, () => 0)[0];
          link(source, entry.rules);
          this.sheets.push({ name: entry.name, nodes: this.cssNodes(entry.rules, source, null, [], /* @__PURE__ */ new Set(), [entry.sheet]), unread: false });
        }
        const inline = [];
        for (const el of document.querySelectorAll("[style]")) {
          if (helper(el) || !el.style.length) continue;
          const head = `${name(el)} (inline)`;
          const model = this.cssModel(el, head, parseDecls(el.getAttribute("style"), 0, el.getAttribute("style").length), { inlineEl: el, selector: null, wraps: [] });
          if (this.ui.sized.has(el)) {
            const own = this.ui.sized.get(el), before = own ? parseDecls(own, 0, own.length) : [];
            for (const d of model.decls) if (d.type === "decl" && !before.some((b) => b.type === "decl" && b.prop === d.prop && b.value === d.value)) d.auto = true;
          }
          inline.push({ type: "rule", head, rule: model.rule, model, decls: model.decls });
        }
        this.inlineNodes = inline;
        this.cssState = this.cssSnapshot();
        this.ui.built();
      };
      build();
      await Promise.all(entries().map(async (entry) => {
        if (!entry.sheet.href || !entry.rules || this.cssSources.has(entry.sheet)) return;
        const abort = new AbortController();
        const cancelled = () => abort.abort();
        signal.addEventListener("abort", cancelled, { once: true });
        const timer = setTimeout(cancelled, 5e3);
        try {
          const response = await fetch(entry.sheet.href, { cache: "force-cache", signal: abort.signal });
          if (response.ok) this.cssSources.set(entry.sheet, { text: await response.text() });
        } catch {
        } finally {
          clearTimeout(timer);
          signal.removeEventListener("abort", cancelled);
        }
      }));
      if (signal.aborted || !this.ui.alive() || generation !== this.cssGeneration) throw new DOMException("Disconnected", "AbortError");
      build();
    }
    cssNodes(rules, source = [], parent = null, wraps = [], seen = /* @__PURE__ */ new Set(), sheetChain = []) {
      const nodes = [], sourceByRule = /* @__PURE__ */ new Map();
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
          } catch {
            nodes.push({ type: "comment", text: `${head} /* imported stylesheet is unreadable */` });
          }
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
      if (!model || !this.dirtyModels.has(model) && !this.ui.keep(model)) {
        const rule = meta.inlineEl ? { style: owner.style, selectorText: "element.style" } : owner;
        model = { rule, head, ...meta, baseline: rule.style.cssText, originalAttribute: meta.inlineEl?.getAttribute("style") ?? null };
        let decls = sourceDecls || [], accepted = false;
        if (decls.length) {
          const text = decls.filter((d) => d.type === "decl").map((d) => `${d.prop}: ${d.value}${d.important ? " !important" : ""};`).join("\n");
          try {
            accepted = this.scratch(model, text).cssText === model.baseline;
          } catch {
            accepted = false;
          }
        }
        if (!accepted) decls = parseDecls(rule.style.cssText, 0, rule.style.cssText.length);
        if (!decls.some((d) => d.type === "decl")) decls = [...rule.style].map((prop) => ({ type: "decl", prop, value: rule.style.getPropertyValue(prop), important: rule.style.getPropertyPriority(prop) === "important", on: true }));
        model.nativeFallback = !!sourceDecls && !accepted;
        model.decls = decls.map((entry) => {
          if (entry.type !== "decl") return { ...entry };
          const d = { ...entry, model, rule, orig: entry.value, on: true };
          try {
            d.live = this.validValue(d, d.value);
          } catch {
            d.live = false;
          }
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
          if (/^@supports\b/.test(h)) {
            try {
              if (!CSS.supports(h.replace(/^@supports\s*/, ""))) return [];
            } catch {
              return [];
            }
          }
        }
        return elements.filter((el) => {
          try {
            return el.matches(model.selector);
          } catch {
            return false;
          }
        });
      }
      let previous;
      try {
        const sheet = new CSSStyleSheet();
        const property = this.probeName;
        const declaration = `${property}: 1 !important;`;
        let body = model.declarationOnly ? declaration : `${model.ownSelector || model.selector} { ${declaration} }`;
        body = model.wraps.reduceRight((inner, head) => `${head} { ${inner} }`, body);
        sheet.replaceSync(`@property ${property} { syntax: "*"; inherits: false; initial-value: 0; }
${body}`);
        if (!sheet.cssRules[0]?.cssText.startsWith("@property")) return [];
        previous = [...document.adoptedStyleSheets];
        document.adoptedStyleSheets = [...previous, sheet];
        return elements.filter((el) => getComputedStyle(el).getPropertyValue(property).trim() === "1");
      } catch {
        return [];
      } finally {
        if (previous) document.adoptedStyleSheets = previous;
      }
    }
    scratch(model, text = "") {
      let style;
      if (/^@(?:font-face|page)\b/.test(model.head)) {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(`${model.head} {}`);
        style = sheet.cssRules[0].style;
      } else style = document.createElement("div").style;
      style.cssText = text;
      return style;
    }
    declarationText(model, swap = null) {
      return model.decls.map((d) => swap && d === swap.d ? { ...d, ...swap.state } : d).filter((d) => d.type === "decl" && d.on).map((d) => `${d.prop}: ${d.value}${d.important ? " !important" : ""};`).join("\n");
    }
    styleChanges(before, after) {
      return [.../* @__PURE__ */ new Set([...before, ...after])].filter(
        (prop) => before.getPropertyValue(prop) !== after.getPropertyValue(prop) || before.getPropertyPriority(prop) !== after.getPropertyPriority(prop)
      ).map((prop) => ({ prop, value: after.getPropertyValue(prop), priority: after.getPropertyPriority(prop) }));
    }
    writeProperty(style, prop, value, priority) {
      if (value === "") style.removeProperty(prop);
      else style.setProperty(prop, value, priority);
    }
    rebaseBaseline(model, live = model.rule.style.cssText) {
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
      const old = model.decls.filter((d) => d.type === "decl"), used = /* @__PURE__ */ new Set();
      const baseline = this.scratch(model, model.baseline);
      const norm2 = (d) => {
        const s = this.scratch(model, `${d.prop}: ${d.value}${d.important ? " !important" : ""}`);
        return `${s.getPropertyValue(d.prop)}${s.getPropertyPriority(d.prop) ? " !important" : ""}`;
      };
      model.decls = parseDecls(live, 0, live.length).map((entry) => {
        if (entry.type !== "decl") return entry;
        const same = old.filter((candidate) => candidate.prop === entry.prop && candidate.on && !used.has(candidate));
        const d = same.length > 1 && same.find((candidate) => norm2(candidate) === norm2(entry)) || same[0] || { model, rule: model.rule };
        used.add(d);
        Object.assign(d, entry, { orig: baseline.getPropertyValue(entry.prop), live: true, on: true });
        return d;
      });
      for (const d of old) if (!used.has(d)) {
        if (this.ui.held(d) || !d.on) {
          d.on = false;
          d.orig = baseline.getPropertyValue(d.prop) || d.orig;
          model.decls.push(d);
        } else this.ui.dropped(d);
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
    settle(model, before) {
      const top = this.topRule(model);
      if (!top || !this.cssState) return;
      const entry = this.cssState.entries.get(top.parentStyleSheet);
      let index = -1;
      try {
        index = entry ? [...top.parentStyleSheet.cssRules].indexOf(top) : -1;
      } catch {
        index = -1;
      }
      if (index >= 0 && entry.rules[index] === before) entry.rules[index] = top.cssText;
    }
    modelAvailable(model) {
      const owner = model.inlineEl || model.rule;
      if (this.modelOf.get(owner) !== model || !this.models.includes(model)) return false;
      if (model.inlineEl) return model.inlineEl.isConnected && !helper(model.inlineEl);
      if (!this.sourceSheets().includes(model.sheetChain?.[0])) return false;
      let rule = model.rule;
      try {
        while (rule.parentRule) {
          if (![...rule.parentRule.cssRules].includes(rule)) return false;
          rule = rule.parentRule;
        }
        return !!rule.parentStyleSheet && [...rule.parentStyleSheet.cssRules].includes(rule);
      } catch {
        return false;
      }
    }
    write(d) {
      const model = d.model;
      const style = model.rule.style;
      const before = this.topRule(model)?.cssText;
      if (!this.dirtyModels.has(model)) {
        model.baseline = style.cssText;
        if (model.inlineEl) model.originalAttribute = model.inlineEl.getAttribute("style");
      } else this.rebaseBaseline(model);
      const proposed = this.scratch(model, this.declarationText(model));
      const previous = this.scratch(model, model.sourceText);
      const touched = this.scratch(model);
      touched.setProperty(d.prop, d.value, d.important ? "important" : "");
      const changed = /* @__PURE__ */ new Set([...this.styleChanges(previous, proposed).map((entry) => entry.prop), ...touched]);
      for (const prop of changed) this.writeProperty(style, prop, proposed.getPropertyValue(prop), proposed.getPropertyPriority(prop));
      this.dirtyModels.add(model);
      model.sourceText = proposed.cssText;
      model.lastApplied = style.cssText;
      this.settle(model, before);
    }
  };

  // src/history.js
  var History = class {
    constructor(onChange, cap = 200) {
      this.entries = [];
      this.cap = cap;
      this.onChange = onChange;
    }
    get length() {
      return this.entries.length;
    }
    push(entry) {
      this.entries.push(entry);
      if (this.entries.length > this.cap) this.entries.shift();
      this.onChange?.(this.entries.length);
    }
    pop() {
      const entry = this.entries.pop();
      this.onChange?.(this.entries.length);
      return entry;
    }
    clear() {
      this.entries = [];
      this.onChange?.(0);
    }
    some(fn) {
      return this.entries.some(fn);
    }
  };

  // src/tools.js
  var Tools = class {
    constructor({ pickTarget, isHelper, editing, cancelEdit, say }) {
      this.pickTarget = pickTarget;
      this.isHelper = isHelper;
      this.editing = editing;
      this.cancelEdit = cancelEdit;
      this.say = say;
      this.defs = /* @__PURE__ */ new Map();
      this.open = [];
      this.active = null;
      this.runtime = null;
    }
    register(id, def) {
      this.defs.set(id, def);
    }
    isOpen(id) {
      return this.open.includes(id);
    }
    arm(id) {
      this.open = [...this.open.filter((k) => k !== id), id];
      this.activate(id);
    }
    end(id) {
      this.open = this.open.filter((k) => k !== id);
      this.activate(this.open.at(-1) ?? null);
    }
    activate(id) {
      this.runtime?.abort();
      this.runtime = null;
      if (this.active) this.defs.get(this.active)?.release?.();
      this.active = id;
      const def = id ? this.defs.get(id) : null;
      if (!def) return;
      this.say(def.label);
      this.runtime = this.shield(def.handlers());
      def.arm?.();
    }
    shield(handlers) {
      const ctrl = new AbortController();
      const options = { capture: true, passive: false, signal: ctrl.signal };
      const onInput = (event) => {
        const target = this.pickTarget(event);
        if (!target || this.isHelper(target)) {
          if (event.type === "pointermove") handlers.leave?.();
          return;
        }
        if (event.cancelable && !event.type.startsWith("touch")) event.preventDefault();
        event.stopImmediatePropagation();
        if (event.type === "pointermove" && target.nodeType === 1) handlers.move?.(target, event);
        else if (event.type === "click" && event.button === 0 && target.nodeType === 1) handlers.click?.(target, event);
      };
      const onKey = (event) => {
        if (event.key === "Escape" && event.type === "keydown") {
          event.preventDefault();
          event.stopImmediatePropagation();
          if (this.editing()) {
            this.cancelEdit();
            return;
          }
          handlers.escape?.();
        }
        handlers.key?.(event);
      };
      for (const type of ["pointermove", "pointerdown", "pointerup", "pointercancel", "mousedown", "mouseup", "click", "dblclick", "contextmenu", "touchstart", "touchmove", "touchend"]) {
        addEventListener(type, onInput, options);
      }
      addEventListener("keydown", onKey, options);
      addEventListener("keyup", onKey, options);
      return ctrl;
    }
  };

  // src/main.js
  var VERSION = "0.1.76";
  var Inspector = class extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot) {
        this.connect();
        return;
      }
      this.setAttribute("data-version", VERSION);
      const root = this.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = style_default;
      root.append(style);
      const tpl = document.createElement("template");
      tpl.innerHTML = MARKUP;
      root.append(tpl.content);
      const $ = (s) => root.querySelector(s);
      this.fab = $(".fab");
      this.byeBtn = $(".bye");
      this.pickBtn = $(".pickbtn");
      this.measureBtn = $(".measure");
      this.sizeBtn = $(".sizebtn");
      this.wval = $(".wval");
      this.wblock = $(".wblock");
      this.sizetools = $(".sizetools");
      this.blocked = null;
      this.handle = $(".hd");
      this.stateText = $(".state");
      this.tools = new Tools({
        pickTarget: (event) => this.pickTarget(event),
        isHelper: helper,
        editing: () => !!this.editor,
        cancelEdit: () => this.editor.finish(true, true),
        say: (text) => {
          this.stateText.textContent = text;
        }
      });
      this.tools.register("sizing", {
        label: "Click an element to resize · Esc to end",
        handlers: () => ({
          click: (target) => this.chooseSize(target),
          escape: () => {
            this.setSizing(false);
            this.sizeBtn.focus();
          }
        }),
        release: () => this.cancelResize()
        // a running drag ends when the tool changes hands or closes
      });
      this.tools.register("picking", {
        label: "Select an element · Esc to cancel",
        handlers: () => ({
          move: (target, event) => {
            this.alt = event.altKey;
            if (target !== this.probe || this.alt !== this.altWas) {
              this.probe = target;
              this.altWas = this.alt;
              this.paint();
            }
          },
          leave: () => {
            if (this.probe) {
              this.probe = null;
              this.paint();
            }
          },
          click: (target) => this.select(target),
          escape: () => {
            this.setPicking(false);
            this.pickBtn.focus();
          },
          key: (event) => {
            if (event.key === "Alt" && this.alt !== (event.type === "keydown")) {
              this.alt = event.type === "keydown";
              this.paint();
            }
          }
        }),
        arm: () => {
          this.cursorStyle ||= Object.assign(document.createElement("style"), { textContent: "html, html *:not(fm-inspector) { cursor: crosshair !important; }" });
          document.head.append(this.cursorStyle);
        },
        release: () => {
          this.cursorStyle?.remove();
          this.probe = null;
        }
      });
      this.sizing = false;
      this.sizeTarget = null;
      this.sized = /* @__PURE__ */ new Map();
      this.wrote = /* @__PURE__ */ new WeakMap();
      this.sizeHandle(this.handle);
      this.hresetBtn = $(".hreset");
      this.hresetBtn.addEventListener("click", () => {
        this.sizeReset(this.sizeTarget);
        this.editor?.finish(true);
        this.reset();
        this.setBlocked(null, "");
      });
      this.sizeHistory = new History((n) => {
        this.sundoBtn.disabled = !n;
      });
      this.sundoBtn = $(".sundo");
      this.sundoBtn.addEventListener("click", () => this.sizeUndo());
      $(".sreset").addEventListener("click", () => this.sizeResetAll());
      $(".rreset").addEventListener("click", () => {
        this.editor?.finish(true);
        this.reset();
        this.setBlocked(null, "");
      });
      this.measuring = false;
      this.rows = /* @__PURE__ */ new Map();
      this.picking = false;
      this.alt = false;
      this.probe = null;
      this.focusEl = null;
      this.panel = $(".panel");
      this.head = $(".head");
      this.body = $(".body");
      this.closeBtn = $(".close");
      this.resetBtn = $(".reset");
      this.undoBtn = $(".undo");
      this.history = new History((n) => {
        this.undoBtn.disabled = !n;
      });
      this.themeBtn = $(".theme");
      this.status = $(".status");
      this.ov = $(".ov");
      this.painter = new Painter(this.ov);
      this.pickSurface = $(".pick-surface");
      this.tabs = [...root.querySelectorAll('[role="tab"]')];
      this.views = { html: $("#view-html"), css: $("#view-css") };
      this.store = new CssStore({
        ownNode: (node) => node === this.cursorStyle,
        signal: () => this.runtime.signal,
        alive: () => this.isConnected,
        sized: this.sized,
        built: () => {
          if (!this.editor) this.renderCss();
          else this.pendingCssRender = true;
          this.paint();
        },
        keep: (model) => model.decls.some((d) => this.pins.has(d) || this.hover === d || this.editor?.declaration === d) || this.blocked?.model === model || this.history.some((entry) => entry.some((step) => step.d.model === model)),
        // the undo history, or the blocked-resize mark, still points at it
        held: (d) => this.pins.has(d) || this.editor?.declaration === d,
        dropped: (d) => {
          if (this.hover === d) this.hover = null;
        }
      });
      this.rowOf = /* @__PURE__ */ new Map();
      this.picks = /* @__PURE__ */ new Map();
      this.pins = /* @__PURE__ */ new Set();
      this.hover = null;
      this.loaded = false;
      this.ro = new ResizeObserver(() => this.paint());
      this.watched = /* @__PURE__ */ new Set();
      this.onMove = () => this.paint();
      this.fab.addEventListener("click", () => this.toggle(true));
      this.closeBtn.addEventListener("click", () => this.toggle(false));
      this.resetBtn.addEventListener("click", () => this.resetAll());
      this.undoBtn.addEventListener("click", () => this.undo());
      this.themeBtn.addEventListener("click", () => this.setTheme(this.dark() ? "light" : "dark"));
      try {
        const t = localStorage.getItem("fm-inspector-theme");
        if (t === "light" || t === "dark") this.setAttribute("theme", t);
      } catch {
      }
      this.byeBtn.addEventListener("click", () => this.dismiss());
      this.pickBtn.addEventListener("click", () => this.setPicking(!this.picking));
      this.measureBtn.addEventListener("click", () => this.setMeasuring(!this.measuring));
      this.sizeBtn.addEventListener("click", () => this.setSizing(!this.sizing));
      this.tabs.forEach((t) => t.addEventListener("click", () => {
        this.fold(false);
        this.show(t.id === "tab-css" ? "css" : "html");
        t.focus();
      }));
      this.head.addEventListener("click", (e) => {
        if (!e.target.closest("button") && !this.phone()) this.fold(!this.hasAttribute("folded"));
      });
      this.head.title = "Click to fold, drag to move";
      root.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && this.hasAttribute("open")) {
          e.preventDefault();
          this.toggle(false);
        }
        if (e.target.getAttribute("role") === "tab" && ["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
          e.preventDefault();
          const i = this.tabs.indexOf(e.target);
          const next = e.key === "Home" ? this.tabs[0] : e.key === "End" ? this.tabs.at(-1) : this.tabs[(i + (e.key === "ArrowRight" ? 1 : this.tabs.length - 1)) % this.tabs.length];
          next.focus();
          next.click();
        }
      });
      root.addEventListener("click", (e) => {
        if (this.dragged) {
          e.stopPropagation();
          e.preventDefault();
        }
      }, true);
      this.draggable(this.head);
      this.draggable(this.fab);
      this.sheetDrag(this.head);
      root.querySelectorAll(".rz").forEach((h) => this.resizable(h));
      this.onResize = () => {
        this.fit();
        this.markHits();
        this.paint();
      };
      this.panelRo = new ResizeObserver(this.onResize);
      this.show("html");
      this.connect();
      readSource().then(() => {
        if (this.loaded) {
          this.htmlDirty = true;
          this.queueLoad();
        }
      });
    }
    dark() {
      const t = this.getAttribute("theme");
      return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    }
    setTheme(t) {
      this.setAttribute("theme", t);
      try {
        localStorage.setItem("fm-inspector-theme", t);
      } catch {
      }
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
        if (records.some((r) => r.type === "childList" && ROOTS().includes(r.target))) markForeign();
        const ours = (n) => n === this.cursorStyle || helper(n?.nodeType === 1 ? n : n?.parentElement);
        const own = (r) => ours(r.target) || r.type === "childList" && [...r.addedNodes, ...r.removedNodes].length > 0 && [...r.addedNodes, ...r.removedNodes].every(ours);
        const ignoreFlip = (r) => r.type === "attributes" && r.attributeName === "data-fm-inspector-ignore";
        if (records.every((r) => own(r) && !ignoreFlip(r))) return;
        this.htmlDirty = true;
        this.prunePicks();
        const ownWrite = (r) => r.type === "attributes" && r.attributeName === "style" && (this.store.modelOf.get(r.target)?.lastApplied === r.target.style.cssText || r.target === this.sizeDrag);
        const sheetish = (n) => n?.nodeType === 1 && !ours(n) && (n.matches("style, link[rel~='stylesheet'], [style]") || !!n.querySelector("style, link[rel~='stylesheet'], [style]"));
        const cssChange = records.some((r) => ignoreFlip(r) || !own(r) && !ownWrite(r) && (r.type === "attributes" && (r.attributeName === "style" || r.target.matches("style, link")) || (r.target.nodeType === 1 ? r.target.closest("style") : r.target.parentElement?.closest("style")) || [...r.addedNodes, ...r.removedNodes].some(sheetish)));
        if ((this.loaded || this.loading) && cssChange) this.queueLoad();
        this.markHits();
        this.paint();
      });
      this.mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
      document.addEventListener("load", (event) => {
        if (event.target?.matches?.("link[rel~='stylesheet']") && (this.loaded || this.loading)) this.queueLoad();
      }, { capture: true, signal });
      this.cssTimer = setInterval(() => {
        if (!this.loaded || !this.hasAttribute("open") && !this.pins.size && !this.picking && !this.sizing && !this.measuring) return;
        if (this.store.changed()) this.queueLoad();
      }, 500);
      if (this.loaded) this.queueLoad();
      this.paint();
    }
    disconnectedCallback() {
      this.editor?.finish(true);
      this.dispose();
    }
    dispose() {
      if (!this.connected) return;
      this.cancelGesture?.();
      this.setPicking(false);
      this.setSizing(false);
      this.setMeasuring(false);
      this.connected = false;
      this.runtime.abort();
      this.ro.disconnect();
      this.panelRo.disconnect();
      this.mo.disconnect();
      this.watched.clear();
      cancelAnimationFrame(this.paintFrame);
      this.paintFrame = null;
      cancelAnimationFrame(this.refreshFrame);
      this.refreshFrame = null;
      clearInterval(this.cssTimer);
      this.loadAgain = false;
      clearTimeout(this.clickTimer);
      this.dragged = false;
    }
    prunePicks() {
      for (const [el] of this.picks) if (!el.isConnected || helper(el)) this.picks.delete(el);
      if (!this.focusEl?.isConnected || helper(this.focusEl)) this.focusEl = [...this.picks.keys()].pop() || null;
      for (const el of this.sized.keys()) if (!el.isConnected || helper(el)) this.sized.delete(el);
      if (this.sizeTarget && (!this.sizeTarget.isConnected || helper(this.sizeTarget))) {
        this.cancelResize();
        this.sizeTarget = null;
        this.handle.removeAttribute("data-on");
        this.hresetBtn.removeAttribute("data-on");
        this.wval.textContent = "";
      }
    }
    gesture(e, move, done, capture = true) {
      this.cancelGesture?.();
      const ctrl = new AbortController(), target = e.currentTarget, id = e.pointerId;
      let ended = false;
      const end = (event, cancelled = false) => {
        if (ended) return;
        if (event && event.pointerId != null && event.pointerId !== id) return;
        ended = true;
        ctrl.abort();
        this.cancelGesture = null;
        if (target.hasPointerCapture?.(id)) target.releasePointerCapture(id);
        this.removeAttribute("dragging");
        this.removeAttribute("resizing");
        this.style.cursor = "";
        done(event, cancelled || event?.type === "pointercancel");
      };
      this.cancelGesture = () => end(null, true);
      const options = { signal: ctrl.signal };
      addEventListener("pointermove", (event) => {
        if (event.pointerId === id) move(event);
      }, options);
      addEventListener("pointerup", end, options);
      addEventListener("pointercancel", end, options);
      target.addEventListener("lostpointercapture", (event) => {
        if (event.target === target) end(event, true);
      }, options);
      const grab = () => {
        if (!ended) try {
          target.setPointerCapture(id);
        } catch {
        }
      };
      if (capture) grab();
      return grab;
    }
    suppressClick() {
      this.dragged = true;
      clearTimeout(this.clickTimer);
      this.clickTimer = setTimeout(() => {
        this.dragged = false;
      }, 100);
    }
    draggable(handle) {
      handle.addEventListener("pointerdown", (e) => {
        if (e.button !== 0 || this.phone() || e.target.closest("input, a")) return;
        if (!e.target.closest("button")) e.preventDefault();
        const from = { x: e.clientX, y: e.clientY, ...this.anchor() };
        let moved = false;
        const grab = this.gesture(e, (event) => {
          const dx = event.clientX - from.x, dy = event.clientY - from.y;
          if (!moved && Math.hypot(dx, dy) < 4) return;
          if (!moved) grab();
          moved = true;
          this.setAttribute("dragging", "");
          this.moveTo(from.right - dx, from.top + dy);
          this.paint();
        }, (_, cancelled) => {
          if (cancelled) this.moveTo(from.right, from.top);
          if (moved) this.suppressClick();
        }, false);
      });
    }
    phone() {
      return matchMedia("(max-width: 480px)").matches;
    }
    sheetDrag(handle) {
      handle.addEventListener("pointerdown", (e) => {
        if (e.button !== 0 || !this.phone() || this.hasAttribute("folded") || e.target.closest("input, a")) return;
        if (!e.target.closest("button")) e.preventDefault();
        const from = { y: e.clientY, height: this.panel.getBoundingClientRect().height, sheet: this.panel.style.getPropertyValue("--sheet") };
        let moved = false, height = from.height;
        const grab = this.gesture(e, (event) => {
          const dy = event.clientY - from.y;
          if (!moved && Math.abs(dy) < 4) return;
          if (!moved) grab();
          moved = true;
          this.setAttribute("dragging", "");
          height = Math.min(Math.max(from.height - dy, this.head.offsetHeight), innerHeight / 2);
          this.panel.style.setProperty("--sheet", `${height}px`);
        }, (_, cancelled) => {
          if (cancelled) {
            if (from.sheet) this.panel.style.setProperty("--sheet", from.sheet);
            else this.panel.style.removeProperty("--sheet");
          }
          if (moved) this.suppressClick();
          this.paint();
        }, false);
      });
      let lastTap = null;
      handle.addEventListener("click", (e) => {
        if (!this.phone() || this.dragged || e.target.closest("button, input, a")) {
          lastTap = null;
          return;
        }
        const tap = { t: Date.now(), x: e.clientX, y: e.clientY };
        const double = lastTap && tap.t - lastTap.t < 350 && Math.hypot(tap.x - lastTap.x, tap.y - lastTap.y) < 24;
        lastTap = double ? null : tap;
        if (double) this.setSheetCollapsed(!this.sheetCollapsed());
      });
    }
    sheetCollapsed() {
      return this.panel.getBoundingClientRect().height <= this.head.offsetHeight + 2;
    }
    setSheetCollapsed(on) {
      if (on) this.panel.style.setProperty("--sheet", `${this.head.offsetHeight}px`);
      else this.panel.style.removeProperty("--sheet");
      this.paint();
    }
    resizable(handle) {
      const edge = handle.dataset.edge;
      handle.addEventListener("pointerdown", (e) => {
        if (e.button !== 0 || this.phone() || this.hasAttribute("folded")) return;
        e.preventDefault();
        const r = this.panel.getBoundingClientRect(), from = { x: e.clientX, y: e.clientY, left: r.left, top: r.top, right: r.right, bottom: r.bottom };
        this.setAttribute("resizing", "");
        this.style.cursor = getComputedStyle(handle).cursor;
        this.gesture(e, (event) => {
          const dx = event.clientX - from.x, dy = event.clientY - from.y;
          let { left, top, right, bottom } = from;
          if (edge.includes("w")) left += dx;
          if (edge.includes("e")) right += dx;
          if (edge.includes("n")) top += dy;
          if (edge.includes("s")) bottom += dy;
          this.setRect(left, top, right, bottom, edge);
        }, (_, cancelled) => {
          if (cancelled) this.setRect(from.left, from.top, from.right, from.bottom);
          this.suppressClick();
          this.paint();
        });
      });
    }
    setRect(left, top, right, bottom, edge = "") {
      if (this.phone()) return;
      const minW = Math.min(344, innerWidth - 16), minH = Math.min(100, innerHeight - 16);
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
      if (this.phone()) return;
      const { top, right } = this.anchor();
      w = Math.min(Math.max(w, Math.min(344, innerWidth - 16)), innerWidth - 16);
      h = Math.min(Math.max(h, Math.min(100, innerHeight - 16)), innerHeight - 16);
      this.panel.style.inlineSize = `${w}px`;
      this.panel.style.blockSize = `${h}px`;
      this.panel.style.maxBlockSize = "none";
      this.moveTo(Math.min(right, innerWidth - w - 8), Math.min(top, innerHeight - h - 8));
    }
    anchor() {
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
        this.panel.style.removeProperty("--sheet");
        this.fab.focus();
      }
      this.paint();
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
      if (this.loading) {
        this.loadAgain = true;
        return;
      }
      if (this.refreshFrame != null) return;
      this.refreshFrame = requestAnimationFrame(() => {
        this.refreshFrame = null;
        this.load();
      });
    }
    load() {
      if (!this.connected) return Promise.resolve();
      cancelAnimationFrame(this.refreshFrame);
      this.refreshFrame = null;
      this.loadAgain = true;
      if (this.loading) return this.loading;
      const runtime = this.runtime;
      this.loading = (async () => {
        do {
          this.loadAgain = false;
          this.loadHtml();
          await this.store.load();
          if (runtime.signal.aborted || this.runtime !== runtime) return;
          this.loaded = true;
          if (this.editor?.field.getAttribute("aria-invalid") !== "true") this.status.textContent = "";
        } while (this.loadAgain && this.connected);
      })().catch((e) => {
        if (e.name !== "AbortError" && this.isConnected) this.status.textContent = "CSS could not be loaded. Close and reopen the panel to retry.";
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
      markForeign();
      const folds = new Set([...this.rows].filter(([, row]) => row.hasAttribute("data-folded")).map(([el]) => el));
      const focused = this.shadowRoot.activeElement?.closest(".row")?.pageElement;
      this.rows = /* @__PURE__ */ new Map();
      const fragment = document.createDocumentFragment();
      this.tree(fragment, document.body, 0);
      this.views.html.replaceChildren(fragment);
      for (const el of folds) {
        const row = this.rows.get(el);
        if (row) this.setFolded(row, true);
      }
      this.prunePicks();
      for (const [el, pick] of this.picks) {
        pick.row = this.rows.get(el);
        if (!pick.row) continue;
        this.setPickedRow(pick.row, true);
        pick.row.style.setProperty("--accent", `var(--pick-${pick.hue % PALETTE})`);
      }
      if (focused) this.rows.get(focused)?.pickButton.focus();
      this.htmlDirty = false;
    }
    tree(out, el, depth) {
      const kids = [...el.childNodes].filter((n) => !skip(n));
      const textOnly = kids.length > 0 && kids.every((n) => n.nodeType === 3);
      const row = this.row(depth);
      row.pageElement = el;
      const caret = document.createElement("button");
      caret.type = "button";
      caret.className = "caret";
      row.caret = caret;
      caret.setAttribute("aria-label", "Collapse element");
      caret.setAttribute("aria-expanded", "true");
      const select = document.createElement("button");
      select.type = "button";
      select.className = "pickrow";
      select.setAttribute("aria-pressed", "false");
      select.setAttribute("aria-label", `Select ${name(el)}`);
      select.append(this.openTag(el));
      row.pickButton = select;
      select.addEventListener("click", () => this.pick(el, row));
      row.append(caret, select);
      this.setPickedRow(row, false);
      this.rows.set(el, row);
      out.append(row);
      if (!rendered(el)) {
        row.classList.add("na");
        row.title = "Not rendered on the page";
        select.disabled = true;
      }
      const foldable = !VOID.has(el.localName) && kids.length > 0;
      if (!foldable) {
        caret.classList.add("none");
        caret.disabled = true;
        caret.tabIndex = -1;
        if (!VOID.has(el.localName)) select.append(span("tag", `</${el.localName}>`));
        return;
      }
      caret.addEventListener("click", () => this.setFolded(row, !row.hasAttribute("data-folded")));
      if (textOnly) {
        const text = squash(kids.map((n) => n.data).join(""));
        row.tx = span("tx", text);
        row.full = text;
        select.append(row.tx, span("tag", `</${el.localName}>`));
        if (text.length > TRUNC) this.setFolded(row, true);
        else {
          caret.classList.add("none");
          caret.disabled = true;
          caret.tabIndex = -1;
        }
        return;
      }
      select.append(span("fold c", "…"), span("fold tag", `</${el.localName}>`));
      for (const n of kids) {
        if (n.nodeType === 1) this.tree(out, n, depth + 1);
        else {
          const child = this.row(depth + 1);
          child.append(span(n.nodeType === 8 ? "c" : "tx", n.nodeType === 8 ? `<!--${n.data}-->` : squash(n.data)));
          out.append(child);
        }
      }
      const close = this.row(depth);
      close.classList.add("cl");
      close.append(span("tag", `</${el.localName}>`));
      out.append(close);
      row.close = close;
    }
    row(depth) {
      const row = document.createElement("div");
      row.className = "row";
      row.style.setProperty("--d", depth);
      return row;
    }
    openTag(el) {
      const f = span("ot", "");
      f.append(span("tag", `<${el.localName}`));
      for (const a of el.attributes) {
        f.append(" ", span("an", a.name));
        if (a.value !== "") f.append(`="${a.value}"`);
      }
      f.append(span("tag", ">"));
      return f;
    }
    setFolded(row, on) {
      row.toggleAttribute("data-folded", on);
      row.caret?.setAttribute("aria-expanded", String(!on));
      row.caret?.setAttribute("aria-label", on ? "Expand element" : "Collapse element");
      if (row.tx) {
        row.tx.textContent = on ? row.full.slice(0, TRUNC).trimEnd() + " …" : row.full;
        return;
      }
      if (!row.close) return;
      let n = row.nextElementSibling;
      while (n && n !== row.close) {
        n.hidden = on;
        if (!on && n.hasAttribute("data-folded") && n.close) {
          let m = n.nextElementSibling;
          while (m && m !== n.close) {
            m.hidden = true;
            m = m.nextElementSibling;
          }
          n.close.hidden = true;
          n = n.close;
        }
        n = n.nextElementSibling;
      }
      row.close.hidden = on;
    }
    reveal(el) {
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
    /* ---------- the resize tool: one element at a time, by its handles ---------- */
    setSizing(on) {
      if (on === this.sizing) return;
      if (!on) this.cancelResize();
      this.sizing = on;
      this.sizeBtn.setAttribute("aria-pressed", String(on));
      this.toggleAttribute("sizing", on);
      if (on) this.tools.arm("sizing");
      else {
        this.sizeTarget = null;
        this.setBlocked(null, "");
        this.handle.removeAttribute("data-on");
        this.hresetBtn.removeAttribute("data-on");
        this.wval.textContent = "";
        this.tools.end("sizing");
      }
      this.paint();
    }
    writeSize(el, px, snap = true) {
      const base = this.parentBase(el), prop = this.sizeProp(el);
      if (base > 0 && !snap) px = Math.min(px, Math.round(base));
      let value;
      if (base > 0 && snap && px >= base - 0.5) {
        const cs = getComputedStyle(el);
        const extra = cs.boxSizing === "content-box" ? num(cs.paddingLeft) + num(cs.paddingRight) + num(cs.borderLeftWidth) + num(cs.borderRightWidth) : 0;
        value = extra ? `calc(100% - ${fmt(extra)}px)` : "100%";
      } else value = `${Math.max(1, px)}px`;
      el.style.setProperty(prop, value, el.style.getPropertyPriority(prop));
      this.wrote.set(el, { attr: el.getAttribute("style"), prop });
      return base > 0 && px > base + 0.5;
    }
    sizeProp(el) {
      return /^(vertical|sideways)/.test(getComputedStyle(el).writingMode) ? "block-size" : "inline-size";
    }
    sizeOf(el, attr, prop = this.sizeProp(el)) {
      const style = document.createElement("div").style;
      style.cssText = attr || "";
      return { prop, value: style.getPropertyValue(prop), priority: style.getPropertyPriority(prop), cssText: style.cssText };
    }
    restoreSize(el, attr, prop = this.sizeProp(el)) {
      if (!el.isConnected) return;
      const want = this.sizeOf(el, attr, prop);
      this.store.writeProperty(el.style, want.prop, want.value, want.priority);
      if (el.style.cssText === want.cssText) this.restoreStyle(el, attr);
      this.wrote.set(el, { attr: el.getAttribute("style"), prop });
    }
    pageSized(el) {
      const ours = this.wrote.get(el);
      if (!ours) return false;
      const now = this.sizeOf(el, el.getAttribute("style"), ours.prop), expected = this.sizeOf(el, ours.attr, ours.prop);
      return now.value !== expected.value || now.priority !== expected.priority;
    }
    cancelResize() {
      if (this.sizeDrag) this.cancelGesture?.();
    }
    resizeSupported(el) {
      for (let node = el; node; node = node.parentElement) {
        const cs = getComputedStyle(node);
        if (cs.transform !== "none" || cs.zoom && cs.zoom !== "normal" && num(cs.zoom) !== 1) return false;
      }
      return true;
    }
    parentBase(el) {
      const parent = el.parentElement, cs = getComputedStyle(el);
      if (!parent || /absolute|fixed/.test(cs.position) || cs.display === "inline") return 0;
      const pcs = getComputedStyle(parent);
      if (/grid/.test(pcs.display) && this.sizeLimits(el, cs).whyW !== "grid") return 0;
      return parent.getBoundingClientRect().width - num(pcs.paddingLeft) - num(pcs.paddingRight) - num(pcs.borderLeftWidth) - num(pcs.borderRightWidth);
    }
    crush(el, kids) {
      const depth = (node) => {
        let n = 0;
        for (let p = node; p && p !== el; p = p.parentElement) n++;
        return n;
      };
      for (const kid of [...kids].sort((a, b) => depth(a) - depth(b))) {
        if (!kid.isConnected || !kid.parentElement) continue;
        const pcs = getComputedStyle(kid.parentElement), pr = kid.parentElement.getBoundingClientRect();
        const inner = pr.width - num(pcs.paddingLeft) - num(pcs.paddingRight) - num(pcs.borderLeftWidth) - num(pcs.borderRightWidth);
        const kcs = getComputedStyle(kid), kr = kid.getBoundingClientRect();
        const room = inner - Math.max(num(kcs.marginLeft), 0) - Math.max(num(kcs.marginRight), 0);
        if (kr.width <= room + 0.5) continue;
        const extra = kcs.boxSizing === "content-box" ? num(kcs.paddingLeft) + num(kcs.paddingRight) + num(kcs.borderLeftWidth) + num(kcs.borderRightWidth) : 0;
        this.writeSize(kid, Math.max(1, Math.round(room - extra)));
      }
    }
    sizeLimits(el, cs) {
      const parent = el.parentElement;
      const out = { w: Infinity, whyW: null, parent: null };
      if (!parent || /absolute|fixed/.test(cs.position)) return out;
      out.parent = parent;
      const pcs = getComputedStyle(parent);
      if (/grid/.test(pcs.display)) {
        const decl = this.declaredOn(parent, ["grid-template-columns", "grid-template", "grid"]);
        const sizes = pcs.gridTemplateColumns.split(" ").map(num).filter((n) => n > 0), gap = num(pcs.columnGap);
        if (decl && sizes.length) {
          const tokens = this.trackTokens(decl.value), pr = parent.getBoundingClientRect(), r = el.getBoundingClientRect();
          let x = pr.left + num(pcs.borderLeftWidth) + num(pcs.paddingLeft), first = -1, last = -1, width = 0;
          sizes.forEach((size, i) => {
            const overlaps = x + size > r.left + 0.5 && x < r.right - 0.5;
            if (overlaps) {
              if (first < 0) first = i;
              last = i;
              width += size + (first < i ? gap : 0);
            }
            x += size + gap;
          });
          const fixed = (t) => /^(\d|\.)/.test(t) && /(px|%|em|rem|vw|vh|vmin|vmax|fr|ch|ex)$/.test(t) || /^minmax\(.*,\s*(\d|\.)[^)]*(px|%|em|rem|vw|vh|fr|ch)\)$/.test(t);
          if (first >= 0 && tokens.length && Array.from({ length: last - first + 1 }, (_, k) => tokens[Math.min(first + k, tokens.length - 1)]).every(fixed)) {
            out.w = width;
            out.whyW = "grid";
          }
        }
      }
      return out;
    }
    declaredOn(el, props) {
      const models = this.store.models.filter((m) => !m.inlineEl && this.store.matchModel(m, [el]).length > 0);
      for (const m of models.reverse()) for (const d of [...m.decls].reverse()) if (d.type === "decl" && d.on && d.live && props.includes(d.prop)) return d;
      return null;
    }
    trackTokens(value, limit = 2048) {
      const tokens = [];
      let depth = 0, brackets = 0, quote = null, token = "";
      const source = value.replace(/\/\*[\s\S]*?\*\//g, "");
      for (let i = 0; i < source.length; i++) {
        const ch = source[i];
        if (quote) {
          token += ch;
          if (ch === "\\") token += source[++i] || "";
          else if (ch === quote) quote = null;
          continue;
        }
        if (ch === '"' || ch === "'") quote = ch;
        else if (ch === "(") depth++;
        else if (ch === ")") depth = Math.max(0, depth - 1);
        else if (ch === "[") brackets++;
        else if (ch === "]") brackets = Math.max(0, brackets - 1);
        if (/\s/.test(ch) && !depth && !brackets) {
          if (token) tokens.push(token);
          token = "";
        } else token += ch;
      }
      if (token) tokens.push(token);
      const out = [];
      for (const item of tokens) {
        if (out.length >= limit) break;
        if (/^\[.*\]$/.test(item)) continue;
        const repeat = item.match(/^repeat\((auto-fill|auto-fit|\d+),\s*(.*)\)$/);
        if (!repeat) {
          out.push(item);
          continue;
        }
        const inner = this.trackTokens(repeat[2], limit - out.length);
        if (!inner.length) continue;
        const count = /^\d+$/.test(repeat[1]) ? Math.min(Number(repeat[1]), Math.ceil((limit - out.length) / inner.length)) : 1;
        for (let n = 0; n < count && out.length < limit; n++) out.push(...inner.slice(0, limit - out.length));
      }
      return out;
    }
    contentNeed(el) {
      const cs = getComputedStyle(el), out = { x: 0, y: 0 };
      if (cs.display === "inline" || !el.scrollWidth) return out;
      if (cs.overflowX === "visible") out.x = el.scrollWidth - el.clientWidth;
      if (cs.overflowY === "visible") out.y = el.scrollHeight - el.clientHeight;
      return out;
    }
    overflow(el, parent) {
      const r = el.getBoundingClientRect(), pr = parent.getBoundingClientRect(), pcs = getComputedStyle(parent), cs = getComputedStyle(el);
      const right = pr.right - num(pcs.paddingRight) - num(pcs.borderRightWidth), bottom = pr.bottom - num(pcs.paddingBottom) - num(pcs.borderBottomWidth);
      return { x: r.right + Math.max(num(cs.marginRight), 0) - right, y: r.bottom + Math.max(num(cs.marginBottom), 0) - bottom };
    }
    explainSize(el, wantW) {
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el), parent = el.parentElement, pcs = parent ? getComputedStyle(parent) : null;
      const axes = Math.abs(wantW - r.width) > 1 ? [{ axis: "x", want: wantW, got: r.width }] : [];
      this.setBlocked(null, "");
      if (!axes.length) return;
      const rendered2 = (x) => this.store.matchModel(x, [el]).length > 0;
      const own = this.store.models.filter((m) => !m.inlineEl && m.decls.some((d) => d.type === "decl" && d.on) && rendered2(m));
      const above = parent ? this.store.models.filter((m) => !m.inlineEl && m.decls.some((d) => d.type === "decl" && d.on) && this.store.matchModel(m, [parent]).length > 0) : [];
      const find = (models, props) => {
        for (const m of [...models].reverse()) for (const d of [...m.decls].reverse()) if (d.type === "decl" && d.on && d.live && props.includes(d.prop)) return d;
        return null;
      };
      const flex = /flex/.test(pcs?.display || ""), grid = /grid/.test(pcs?.display || ""), row = !/column/.test(pcs?.flexDirection || "");
      for (const { axis, want, got } of axes) {
        const x = axis === "x";
        const cap = this.sizeCap?.[axis];
        const maxP = x ? ["max-width", "max-inline-size"] : ["max-height", "max-block-size"], minP = x ? ["min-width", "min-inline-size"] : ["min-height", "min-block-size"];
        const maxC = x ? cs.maxWidth : cs.maxHeight, minC = x ? cs.minWidth : cs.minHeight;
        const pad = cs.boxSizing === "content-box" ? x ? num(cs.paddingLeft) + num(cs.paddingRight) + num(cs.borderLeftWidth) + num(cs.borderRightWidth) : num(cs.paddingTop) + num(cs.paddingBottom) + num(cs.borderTopWidth) + num(cs.borderBottomWidth) : 0;
        if (maxC !== "none" && got < want && Math.abs(num(maxC) + pad - got) <= 1) {
          const d2 = find(own, maxP);
          this.setBlocked(d2, `held by ${d2 ? `${d2.prop}: ${d2.value}` : `${maxP[0]}: ${maxC}`}`);
          return;
        }
        if (minC !== "auto" && num(minC) > 0 && got > want && Math.abs(num(minC) + pad - got) <= 1) {
          const d2 = find(own, minP);
          this.setBlocked(d2, `held by ${d2 ? `${d2.prop}: ${d2.value}` : `${minP[0]}: ${minC}`}`);
          return;
        }
        if (cap === "content") {
          const er = el.getBoundingClientRect();
          const child = [...el.children].filter((c) => !helper(c)).sort((a, b) => {
            const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
            return x ? rb.right - ra.right : rb.bottom - ra.bottom;
          })[0];
          const d2 = child ? this.store.models.find((m) => m.inlineEl === child)?.decls.find((k) => k.type === "decl" && k.on && k.prop === (x ? "inline-size" : "block-size")) || null : null;
          this.setBlocked(d2, `held by content${child ? `: ${name(child)}` : ""}`, child || null);
          return;
        }
        if (cap) {
          const d2 = cap === "grid" ? find(above, x ? ["grid-template-columns", "grid-auto-columns", "grid-template", "grid"] : ["grid-template-rows", "grid-auto-rows", "grid-template", "grid"]) : find(above, x ? ["width", "inline-size", "max-width", "max-inline-size"] : ["height", "block-size", "max-height", "max-block-size"]);
          if (cap === "grid") {
            this.setBlocked(d2, `grid track${d2 ? `: ${d2.value}` : ""}`, parent);
            return;
          }
          if (d2) {
            this.setBlocked(d2, `${name(parent)}: ${d2.prop}: ${d2.value}`, parent);
            return;
          }
          const gp = parent?.parentElement, gcs = gp ? getComputedStyle(gp) : null;
          if (gcs && /grid/.test(gcs.display)) {
            const g = this.declaredOn(gp, ["place-items", "justify-items"]) || this.declaredOn(parent, ["justify-self", "place-self"]) || this.declaredOn(gp, ["display"]);
            this.setBlocked(g, `${name(gp)} grid${g ? `: ${g.prop}: ${g.value}` : ""}`, parent);
            return;
          }
          if (gcs && /flex/.test(gcs.display)) {
            const g = this.declaredOn(parent, ["flex", "flex-grow"]) || this.declaredOn(gp, ["display"]);
            this.setBlocked(g, `${name(gp)} flex${g ? `: ${g.prop}: ${g.value}` : ""}`, parent);
            return;
          }
          this.setBlocked(null, `${name(parent)}: content-sized`, parent);
          return;
        }
        const max = x ? ["max-width", "max-inline-size"] : ["max-height", "max-block-size"], min = x ? ["min-width", "min-inline-size"] : ["min-height", "min-block-size"];
        const size = x ? ["width", "inline-size"] : ["height", "block-size"];
        const maxV = x ? cs.maxWidth : cs.maxHeight, minV = x ? cs.minWidth : cs.minHeight;
        let d = null, note = "";
        if (maxV !== "none" && got < want && Math.abs(num(maxV) + (cs.boxSizing === "content-box" ? x ? num(cs.paddingLeft) + num(cs.paddingRight) + num(cs.borderLeftWidth) + num(cs.borderRightWidth) : num(cs.paddingTop) + num(cs.paddingBottom) + num(cs.borderTopWidth) + num(cs.borderBottomWidth) : 0) - got) <= 1) {
          d = find(own, max);
          note = d ? `${d.prop}: ${d.value}` : `${max[0]}: ${maxV}`;
        } else if (minV !== "auto" && num(minV) > 0 && got > want) {
          d = find(own, min);
          note = d ? `${d.prop}: ${d.value}` : `${min[0]}: ${minV}`;
        } else if ((d = find(own, size)) && d.important) note = `${d.prop}: ${d.value} !important`;
        else if (cs.display === "inline") {
          d = find(own, ["display"]);
          note = "display: inline";
        } else if (flex && row === x) {
          const grow = num(cs.flexGrow), shrink = num(cs.flexShrink);
          d = find(own, got < want ? ["flex-shrink", "flex"] : ["flex-grow", "flex"]);
          note = d ? `${d.prop}: ${d.value}` : got < want && shrink ? `flex-shrink: ${shrink}` : got > want && grow ? `flex-grow: ${grow}` : "the flex container";
          if (!d) d = find(above, ["display"]);
        } else if (grid) {
          d = find(above, x ? ["grid-template-columns", "grid-auto-columns"] : ["grid-template-rows", "grid-auto-rows"]);
          note = d ? `${d.prop}: ${d.value}` : "the grid track";
        } else if (/absolute|fixed/.test(cs.position) && (x ? cs.left !== "auto" && cs.right !== "auto" : cs.top !== "auto" && cs.bottom !== "auto")) {
          d = find(own, x ? ["left", "right", "inset", "inset-inline"] : ["top", "bottom", "inset", "inset-block"]);
          note = d ? `${d.prop}: ${d.value}` : "both insets";
        } else {
          d = null;
          note = "";
        }
        if (note) {
          this.setBlocked(d, `held by ${note}`);
          return;
        }
      }
    }
    setBlocked(d, text, area = null) {
      const was = this.blocked;
      this.blocked = d;
      this.wblock.textContent = text;
      this.heldArea = text ? area : null;
      if (was) this.syncRow(was);
      if (d) {
        this.syncRow(d);
        if (this.hasAttribute("open") && this.views.css.hidden) {
          this.fold(false);
          this.show("css");
        }
        const row = this.rowOf.get(d)?.row;
        if (row && !this.views.css.hidden) row.scrollIntoView({ block: "center" });
      }
    }
    chooseSize(el) {
      this.setBlocked(null, "");
      this.sizeTarget = el;
      this.handle.setAttribute("data-on", "");
      this.paint();
    }
    sizeHandle(handle) {
      handle.addEventListener("pointerdown", (e) => {
        const el = this.sizeTarget;
        if (e.button !== 0 || !el || !this.resizeSupported(el)) return;
        e.preventDefault();
        e.stopPropagation();
        if (this.editor && !this.editor.finish(false)) this.editor.finish(true);
        const from = { x: e.clientX, w: el.getBoundingClientRect().width };
        const session = this.resizeStart(el);
        let want = from.w;
        this.gesture(e, (event) => {
          want = Math.max(1, from.w + event.clientX - from.x);
          this.resizeWidth(session, want);
          if (!this.sizeDrag) return;
          const held = this.sizeCap.x || Math.abs(el.getBoundingClientRect().width - want) > 1, now = performance.now();
          if (held && (!this.wblock.textContent || now - (this.explainedAt || 0) > 200)) {
            this.explainedAt = now;
            this.explainSize(el, want);
          } else if (!held && this.wblock.textContent) this.setBlocked(null, "");
        }, (_, cancelled) => {
          this.finishResize(session, cancelled);
          this.suppressClick();
          if (!cancelled && el.isConnected) this.explainSize(el, want);
        });
      });
      handle.addEventListener("keydown", (e) => {
        const el = this.sizeTarget;
        if (!["ArrowLeft", "ArrowRight"].includes(e.key) || !el || !this.resizeSupported(el)) return;
        e.preventDefault();
        e.stopPropagation();
        const session = this.resizeStart(el);
        const want = Math.max(1, el.getBoundingClientRect().width + (e.key === "ArrowRight" ? 1 : -1) * (e.shiftKey ? 10 : 1));
        this.resizeWidth(session, want);
        this.finishResize(session, false);
        this.explainSize(el, want);
      });
    }
    resizeStart(el) {
      if (!this.sized.has(el)) this.sized.set(el, el.getAttribute("style"));
      const cs = getComputedStyle(el);
      const kids = [...this.sized.keys()].filter((kid) => kid !== el && el.contains(kid) && kid.isConnected);
      const before = new Map([el, ...kids].map((node) => [node, node.getAttribute("style")]));
      const extra = cs.boxSizing === "content-box" ? num(cs.paddingLeft) + num(cs.paddingRight) + num(cs.borderLeftWidth) + num(cs.borderRightWidth) : 0;
      this.sizeCap = { x: null, y: null };
      this.sizeDrag = el;
      this.setAttribute("resizing", "");
      return { el, kids, before, extra, limit: this.sizeLimits(el, cs) };
    }
    resizeWidth(session, desired) {
      const { el, kids, before, extra, limit } = session;
      if (!el.isConnected || helper(el)) {
        this.cancelResize();
        return;
      }
      if (!this.resizeSupported(el)) {
        this.cancelResize();
        this.setBlocked(null, "transformed: edit the CSS value instead");
        return;
      }
      let w = Math.max(1, desired);
      this.sizeCap = { x: null, y: null };
      if (w > limit.w) {
        w = limit.w;
        this.sizeCap.x = limit.whyW;
      }
      if (this.writeSize(el, Math.round(w - extra))) this.sizeCap.x ||= "parent";
      const over = limit.parent ? this.overflow(el, limit.parent) : null;
      if (over?.x > 0.5) {
        this.writeSize(el, Math.max(1, Math.round(w - over.x - extra)));
        this.sizeCap.x ||= "parent";
      }
      for (let pass = 0; ; pass++) {
        for (const kid of kids) this.restoreSize(kid, before.get(kid));
        this.crush(el, kids);
        const need = this.contentNeed(el);
        if (need.x <= 1 || pass === 4) break;
        this.writeSize(el, Math.round(el.getBoundingClientRect().width + need.x - extra), false);
        this.sizeCap.x = "content";
      }
      this.paint();
    }
    finishResize(session, cancelled) {
      if (cancelled) for (const [node, attr] of session.before) this.restoreSize(node, attr, this.wrote.get(node)?.prop);
      else {
        const steps = [...session.before].filter(([node, attr]) => node.isConnected && node.getAttribute("style") !== attr).map(([node, attr]) => ({ el: node, before: attr, after: this.wrote.get(node)?.attr ?? node.getAttribute("style"), prop: this.wrote.get(node)?.prop }));
        if (steps.length) this.sizeRecord(steps);
      }
      this.sizeDrag = null;
      this.removeAttribute("resizing");
      this.htmlDirty = true;
      this.queueLoad();
      this.paint();
    }
    sizeReset(el, record = true) {
      this.cancelResize();
      if (!el || !this.sized.has(el)) return;
      this.setBlocked(null, "");
      const before = el.getAttribute("style"), prop = this.wrote.get(el)?.prop;
      if (this.pageSized(el)) {
        this.sized.delete(el);
        this.wrote.delete(el);
        this.setBlocked(null, "resize skipped: the page changed it");
      } else {
        this.restoreSize(el, this.sized.get(el), prop);
        this.sized.delete(el);
        if (record && el.getAttribute("style") !== before) this.sizeRecord([{ el, before, after: el.getAttribute("style"), prop }]);
      }
      this.htmlDirty = true;
      this.queueLoad();
      this.paint();
    }
    restoreStyle(el, attr) {
      if (attr == null) el.removeAttribute("style");
      else el.setAttribute("style", attr);
    }
    sizeRecord(steps) {
      this.sizeHistory.push(steps);
    }
    sizeUndo() {
      this.cancelResize();
      const entry = this.sizeHistory.pop();
      if (!entry) return;
      this.setBlocked(null, "");
      let skipped = 0;
      for (const step of [...entry].reverse()) {
        if (!step.el.isConnected || helper(step.el)) {
          skipped++;
          continue;
        }
        const now = this.sizeOf(step.el, step.el.getAttribute("style"), step.prop), expected = this.sizeOf(step.el, step.after, step.prop);
        if (now.value !== expected.value || now.priority !== expected.priority) {
          skipped++;
          continue;
        }
        if (!this.sized.has(step.el)) this.sized.set(step.el, step.after);
        this.restoreSize(step.el, step.before, step.prop);
        if (step.el.getAttribute("style") === this.sized.get(step.el)) this.sized.delete(step.el);
      }
      if (skipped) this.setBlocked(null, `${skipped} resize${skipped === 1 ? "" : "s"} skipped: the page changed it`);
      this.htmlDirty = true;
      this.queueLoad();
      this.paint();
    }
    sizeResetAll() {
      this.cancelResize();
      let skipped = 0;
      for (const [el, attr] of this.sized) {
        if (this.pageSized(el)) skipped++;
        else this.restoreSize(el, attr, this.wrote.get(el)?.prop);
      }
      this.sized.clear();
      this.sizeHistory.clear();
      if (skipped) this.setBlocked(null, `${skipped} resize${skipped === 1 ? "" : "s"} skipped: the page changed it`);
      this.htmlDirty = true;
      this.queueLoad();
      this.paint();
    }
    paintHold(el, chrome) {
      const { r } = this.painter.geometry(el);
      this.painter.box("dbox", r.left, r.top, r.width, r.height);
      this.painter.chip(this.painter.label("hold", this.wblock.textContent, 0, 0), r, chrome);
    }
    paintSizer(el) {
      const { r } = this.painter.geometry(el);
      this.painter.box("box", r.left, r.top, r.width, r.height);
      this.wval.textContent = `${name(el)} ${fmt(r.width)} × ${fmt(r.height)}px`;
      const supported = this.resizeSupported(el);
      this.handle.disabled = !supported;
      this.handle.setAttribute("aria-label", `Adjust the width of ${name(el)}: ${fmt(r.width)}px`);
      if (!supported && !this.wblock.textContent) this.setBlocked(null, "transformed: edit the CSS value instead");
      const half = this.handle.offsetWidth / 2 || 16;
      const hx = Math.min(Math.max(r.right, half), innerWidth - half), hy = Math.min(Math.max(r.bottom, half), innerHeight - half);
      this.handle.style.left = `${hx}px`;
      this.handle.style.top = `${hy}px`;
      const reset = this.hresetBtn, w = reset.offsetWidth || 50, h = reset.offsetHeight || 20, gap = half + 6;
      reset.toggleAttribute("data-on", this.sized.has(el));
      reset.style.left = `${Math.max(4, hx + gap + w > innerWidth - 4 ? hx - gap - w : hx + gap)}px`;
      reset.style.top = `${Math.max(4, Math.min(hy - h / 2, innerHeight - h - 4))}px`;
    }
    pickTarget(event) {
      const path = event.composedPath();
      if (!path.includes(this.pickSurface)) return path.includes(this) ? null : event.target;
      this.pickSurface.style.pointerEvents = "none";
      const point = event.touches?.[0] || event.changedTouches?.[0] || event;
      try {
        return document.elementsFromPoint(point.clientX, point.clientY).find((el) => !helper(el)) || null;
      } finally {
        this.pickSurface.style.pointerEvents = "";
      }
    }
    setPicking(on) {
      if (on === this.picking) return;
      this.picking = on;
      this.pickBtn.setAttribute("aria-pressed", String(on));
      this.toggleAttribute("picking", on);
      if (on) this.tools.arm("picking");
      else {
        this.alt = false;
        this.clearPicks();
        this.tools.end("picking");
      }
    }
    select(el) {
      let row = this.rows.get(el);
      if (!row) {
        this.loadHtml();
        row = this.rows.get(el);
      }
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
      if (on) this.focusEl = el;
      else if (this.focusEl === el) this.focusEl = [...this.picks.keys()].pop() || null;
      this.markHits();
      this.paint();
    }
    /* ---------- the overlay ---------- */
    marks() {
      const list = [...this.picks].map(([el, p]) => ({ el, model: true, hue: p.hue }));
      if (this.probe && !this.picks.has(this.probe)) {
        if (this.alt && this.focusEl) list.push({ el: this.probe, dist: true });
        else list.push({ el: this.probe, probe: true });
      }
      if (this.sizing && this.sizeTarget) list.push({ el: this.sizeTarget, size: true });
      if (this.sizing && this.heldArea?.isConnected && this.wblock.textContent) list.push({ el: this.heldArea, hold: true });
      if (this.measuring) {
        const right = document.documentElement.clientWidth || innerWidth, bottom = document.documentElement.clientHeight || innerHeight;
        let count = 0;
        for (const el of [document.body, ...document.body.querySelectorAll("*")]) {
          if (this.picks.has(el) || !rendered(el)) continue;
          const r = this.painter.rect(el);
          if (r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < right && r.top < bottom) {
            list.push({ el, measure: true });
            if (++count >= 300) break;
          }
        }
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
        const nativeSelectors = model.scoped || model.wraps.some((h) => !h.startsWith("@"));
        if (nativeSelectors) candidates = [...document.querySelectorAll("*")];
        else try {
          candidates = [...document.querySelectorAll(model.selector)];
        } catch {
          candidates = [];
        }
      }
      const result = this.store.matchModel(model, candidates.filter(rendered));
      this.reachCache?.set(model, result);
      return result;
    }
    paint() {
      if (!this.connected || this.paintFrame != null) return;
      this.paintFrame = requestAnimationFrame(() => {
        this.paintFrame = null;
        if (this.htmlDirty && this.loaded && this.hasAttribute("open") && !this.views.html.hidden && !this.editor && !this.sizeDrag) this.loadHtml();
        this.draw();
      });
    }
    draw() {
      this.prunePicks();
      this.painter.begin();
      this.reachCache = /* @__PURE__ */ new Map();
      const marks = this.marks().filter((m) => rendered(m.el));
      for (const { el } of marks) this.painter.geometry(el);
      const keep = new Set(marks.map((m) => m.el));
      for (const el of this.watched) if (!keep.has(el)) {
        this.ro.unobserve(el);
        this.watched.delete(el);
      }
      for (const el of keep) if (!this.watched.has(el)) {
        this.ro.observe(el);
        this.watched.add(el);
      }
      const chrome = (this.hasAttribute("open") ? this.panel : this.fab).getBoundingClientRect();
      for (const m of marks) {
        this.painter.group(m.probe ? "pick probe" : m.decl ? "pick decl" : m.measure ? "pick ruler" : "pick", m.model ? `var(--pick-${m.hue % PALETTE})` : m.decl ? "var(--css)" : null);
        if (m.model) this.paintModel(m.el, m.hue, chrome);
        else if (m.probe) this.paintProbe(m.el, chrome);
        else if (m.dist) this.paintDistance(this.focusEl, m.el, chrome);
        else if (m.measure) this.paintMeasure(m.el, chrome);
        else if (m.size) this.paintSizer(m.el);
        else if (m.hold) this.paintHold(m.el, chrome);
        else this.paintDecl(m.el, m.decl, chrome);
      }
      this.painter.end();
      this.reachCache = null;
    }
    paintModel(el, hue, chrome) {
      const r = this.painter.geometry(el).r;
      if (el === this.focusEl) {
        this.painter.box("gd v", r.left, 0, 0, innerHeight);
        this.painter.box("gd v", r.right, 0, 0, innerHeight);
        this.painter.box("gd h", 0, r.top, innerWidth, 0);
        this.painter.box("gd h", 0, r.bottom, innerWidth, 0);
      }
      this.painter.box("box", r.left, r.top, r.width, r.height);
      this.painter.chip(this.painter.label("hue", this.painter.chipParts(el, r, false), 0, 0), r, chrome);
      this.painter.dims(r, chrome);
    }
    paintProbe(el, chrome) {
      const r = this.painter.geometry(el).r;
      this.painter.box("box", r.left, r.top, r.width, r.height);
      this.painter.chip(this.painter.label("", this.painter.chipParts(el, r, false), 0, 0), r, chrome);
      this.painter.dims(r, chrome);
    }
    paintMeasure(el, chrome) {
      const { r, p, m, b } = this.painter.geometry(el);
      const all = { t: 1, r: 1, b: 1, l: 1 };
      const pos = { t: Math.max(m.t, 0), r: Math.max(m.r, 0), b: Math.max(m.b, 0), l: Math.max(m.l, 0) };
      if (pos.t || pos.r || pos.b || pos.l) this.painter.ring("mr", this.painter.outer(r, pos), pos, all, "mv");
      if (b.t || b.r || b.b || b.l) this.painter.ring("bd", r, b, all, "bv");
      const inner = { left: r.left + b.l, top: r.top + b.t, right: r.right - b.r, bottom: r.bottom - b.b, width: r.width - b.l - b.r, height: r.height - b.t - b.b };
      if (p.t || p.r || p.b || p.l) this.painter.ring("pd", inner, p, all, "pv");
      this.painter.box("box", r.left, r.top, r.width, r.height);
      this.painter.chip(this.painter.label("", this.painter.chipParts(el, r, true), 0, 0), r, chrome);
      this.paintFree(el, r, m);
    }
    paintFree(el, r, m) {
      const parent = el.parentElement, cs = this.painter.geometry(el).cs;
      if (!parent || helper(parent)) return;
      const pcs = getComputedStyle(parent);
      if (!/^(block|flow-root|list-item)$/.test(pcs.display) || !/^(block|flex|grid|table|list-item|flow-root)$/.test(cs.display) || cs.float !== "none" || /absolute|fixed/.test(cs.position)) return;
      const { r: pr, p: pp, b: pb } = this.painter.geometry(parent);
      const inner = { left: pr.left + pb.l + pp.l, right: pr.right - pb.r - pp.r };
      const top = r.top - Math.max(m.t, 0), height = r.height + Math.max(m.t, 0) + Math.max(m.b, 0);
      for (const [l, w] of [[inner.left, r.left - Math.max(m.l, 0) - inner.left], [r.right + Math.max(m.r, 0), inner.right - r.right - Math.max(m.r, 0)]]) {
        if (w < 24 || height < 8) continue;
        this.painter.box("free", l, top, w, height);
        if (w >= 72) this.painter.label("fv", `unused ${fmt(w)}px`, l + w / 2, top + height / 2);
      }
    }
    setMeasuring(on) {
      if (on === this.measuring) return;
      this.measuring = on;
      if (on) {
        this.rulerRuntime = new AbortController();
        addEventListener("click", (e) => {
          const path = e.composedPath();
          if (this.dragged || path.includes(this.measureBtn) || path.includes(this.pickBtn) || path.includes(this.sizeBtn)) return;
          if (this.tools.active && (!path.includes(this) || path.includes(this.pickSurface))) return;
          this.setMeasuring(false);
        }, { capture: true, signal: this.rulerRuntime.signal });
      } else this.rulerRuntime?.abort();
      this.measureBtn.setAttribute("aria-pressed", String(on));
      this.toggleAttribute("measuring", on);
      this.paint();
    }
    paintDistance(from, to, chrome) {
      const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
      this.painter.box("dbox", b.left, b.top, b.width, b.height);
      let line = null, gap = 0, chipX, chipY;
      const mid = (lo1, hi1, lo2, hi2) => {
        const lo = Math.max(lo1, lo2), hi = Math.min(hi1, hi2);
        return lo < hi ? (lo + hi) / 2 : (lo1 + hi1) / 2;
      };
      if (b.left >= a.right) {
        gap = b.left - a.right;
        const y = mid(a.top, a.bottom, b.top, b.bottom);
        line = this.painter.box("dln", a.right, y, gap, 1);
        chipX = a.right + gap / 2;
        chipY = y;
      } else if (b.right <= a.left) {
        gap = a.left - b.right;
        const y = mid(a.top, a.bottom, b.top, b.bottom);
        line = this.painter.box("dln", b.right, y, gap, 1);
        chipX = b.right + gap / 2;
        chipY = y;
      } else if (b.top >= a.bottom) {
        gap = b.top - a.bottom;
        const x = mid(a.left, a.right, b.left, b.right);
        line = this.painter.box("dln", x, a.bottom, 1, gap);
        chipX = x;
        chipY = a.bottom + gap / 2;
      } else if (b.bottom <= a.top) {
        gap = a.top - b.bottom;
        const x = mid(a.left, a.right, b.left, b.right);
        line = this.painter.box("dln", x, b.bottom, 1, gap);
        chipX = x;
        chipY = b.bottom + gap / 2;
      }
      if (line) this.painter.label("dch", fmt(gap), chipX, chipY);
      this.painter.chip(this.painter.label("", this.painter.chipParts(to, b), 0, 0), b, chrome);
    }
    paintDecl(el, d, chrome) {
      const { r, cs, p, m, b } = this.painter.geometry(el);
      const band = sides(d.prop, cs);
      if (band && band.kind === "padding") {
        this.painter.ring("pd", { left: r.left + b.l, top: r.top + b.t, right: r.right - b.r, bottom: r.bottom - b.b, width: r.width - b.l - b.r, height: r.height - b.t - b.b }, p, band.sides, "pv");
      } else if (band) {
        const pos = { t: Math.max(m.t, 0), r: Math.max(m.r, 0), b: Math.max(m.b, 0), l: Math.max(m.l, 0) };
        this.painter.ring("mr", this.painter.outer(r, pos), pos, band.sides, "mv");
      }
      this.painter.box("box", r.left, r.top, r.width, r.height);
      if (!band && SIZE.test(d.prop)) this.sizeLine(el, d, r, cs, p, b, chrome);
    }
    sizeLine(el, d, r, cs, p, b, chrome) {
      const vertical = /^(vertical|sideways)/.test(cs.writingMode);
      const horizontal = /width/.test(d.prop) || /inline-size/.test(d.prop) && !vertical || /block-size/.test(d.prop) && vertical;
      const resolved = num(cs[camel(d.prop)]);
      const content = cs.boxSizing === "content-box";
      const pad = content ? horizontal ? b.l + p.l : b.t + p.t : 0;
      const len = Number.isFinite(parseFloat(cs[camel(d.prop)])) ? resolved : (horizontal ? r.width : r.height) - (content ? horizontal ? b.l + b.r + p.l + p.r : b.t + b.b + p.t + p.b : 0);
      const text = `${d.prop}: ${d.value}`;
      if (horizontal) {
        const above = r.top >= 32;
        const y = above ? r.top - 10 : r.top + 10;
        this.painter.box("ln dim-width", r.left + pad, y, len, 1);
        const l = this.painter.label("sz", text, 0, y + (above ? -12 : 12));
        this.painter.place(l, "left", r.left + pad, r.left + pad + len, chrome);
      } else {
        const beside = this.painter.beside(r, chrome);
        const x = beside ? r.right + 10 : r.right - 10;
        this.painter.box("ln dim-height", x, r.top + pad, 1, len);
        const l = this.painter.label("sz", text, x + (beside ? 8 : -8), 0);
        l.style.transform = beside ? "translate(0, -50%)" : "translate(-100%, -50%)";
        this.painter.place(l, "top", r.top + pad, r.top + pad + len, chrome);
      }
    }
    /* ---------- CSS tab ---------- */
    renderCss() {
      const view = this.views.css;
      view.replaceChildren();
      this.hover = null;
      this.rowOf = /* @__PURE__ */ new Map();
      this.groups = [];
      if (!this.store.sheets.length && !this.store.inlineNodes?.length) {
        view.append(this.note("No stylesheet on this page."));
        return;
      }
      for (const s of this.store.sheets) {
        if (this.store.sheets.length > 1) view.append(this.comment(`/* ${s.name} */`));
        if (s.unread) {
          view.append(this.comment("/* stylesheet could not be read */"));
          continue;
        }
        this.render(view, s.nodes, 0);
      }
      for (const n of this.store.inlineNodes || []) {
        const el = n.model.inlineEl;
        const matches = this.groups.filter((x) => x.node !== n && x.node.model && !x.node.model.inlineEl && this.store.matchModel(x.node.model, [el]).length > 0);
        const first = matches.find((x) => !/^\*/.test(x.node.model.selector || "")) || matches[0];
        const g = this.group(n, { depth: 0 });
        g.classList.add("inline");
        if (first) first.el.before(g);
        else view.prepend(g);
      }
      this.markHits();
    }
    markHits() {
      const el = this.focusEl, hue = el ? this.picks.get(el)?.hue : null;
      for (const { node, el: g } of this.groups || []) {
        let hit = false;
        if (el && node.model) hit = this.store.matchModel(node.model, [el]).length > 0;
        g.classList.toggle("hit", hit);
        if (hit) g.style.setProperty("--accent", `var(--pick-${hue % PALETTE})`);
        else g.style.removeProperty("--accent");
      }
    }
    scrollToHit() {
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
      const g = document.createElement("div");
      g.className = "grp";
      g.dataset.depth = opts.depth || 0;
      const head = document.createElement("div");
      head.className = "gh";
      head.append(span("sel", n.head));
      if (n.model?.nativeFallback) head.title = "Live CSSOM values; source text differs or contains nested declarations.";
      g.append(head);
      for (const d of n.decls) {
        if (d.type === "blank") continue;
        if (d.type === "comment") {
          g.append(this.comment(d.text));
          continue;
        }
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
          case "blank":
            break;
          case "comment":
            out.append(this.comment(n.text));
            break;
          case "flat":
            out.append(this.comment(n.text));
            break;
          case "opaque":
            out.append(this.comment(`${n.head} { … }`));
            break;
          case "group": {
            const head = document.createElement("div");
            head.className = "gh";
            head.append(span("sel", n.head));
            out.append(head);
            this.render(out, n.children, depth + 1);
            break;
          }
          case "rule":
            out.append(this.group(n, { depth }));
            break;
        }
      }
    }
    declNode(d) {
      const row = document.createElement("div");
      row.className = "d";
      const text = `${d.prop}: ${d.value}${d.important ? " !important" : ""}`;
      if (!d.live) {
        row.classList.add("na");
        row.title = "This declaration is unsupported or read-only";
        row.append(span("t", text));
        return row;
      }
      const box = document.createElement("input");
      box.type = "checkbox";
      box.checked = d.on;
      box.setAttribute("aria-label", `${d.prop}: ${d.value}`);
      box.addEventListener("change", () => {
        const before = this.state(d);
        d.on = box.checked;
        this.apply(d);
        this.syncRow(d);
        this.record([{ d, before, after: this.state(d) }]);
      });
      const show = document.createElement("button");
      show.type = "button";
      show.className = "t";
      show.textContent = `${d.prop}: `;
      show.setAttribute("aria-pressed", String(this.pins.has(d)));
      show.title = `Show where ${d.model.selector || d.model.head} lands`;
      show.addEventListener("click", () => {
        const on = !this.pins.has(d);
        if (on) this.pins.add(d);
        else this.pins.delete(d);
        show.setAttribute("aria-pressed", String(on));
        row.classList.toggle("on", on);
        this.paint();
      });
      const sw = document.createElement("span");
      sw.className = "sw";
      const value = span("v", d.value);
      value.tabIndex = 0;
      value.setAttribute("role", "button");
      value.title = "Click to change the value";
      value.addEventListener("click", () => this.edit(d));
      value.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.edit(d);
        }
      });
      row.addEventListener("pointerenter", () => {
        this.hover = d;
        this.paint();
      });
      row.addEventListener("pointerleave", () => {
        this.hover = null;
        this.paint();
      });
      row.append(box, show, sw, value, span("x", d.important ? "!important" : ""));
      row.classList.toggle("on", this.pins.has(d));
      this.rowOf.set(d, { row, box, value, sw });
      this.syncRow(d);
      return row;
    }
    syncRow(d) {
      const r = this.rowOf.get(d);
      if (!r) return;
      r.box.checked = d.on;
      r.box.setAttribute("aria-label", `${d.prop}: ${d.value}`);
      r.value.textContent = d.value;
      r.row.classList.toggle("off", !d.on);
      r.row.classList.toggle("edited", d.value !== d.orig);
      r.row.classList.toggle("auto", !!d.auto);
      r.row.classList.toggle("block", d === this.blocked);
      const color = isColor(d.prop, d.value);
      r.sw.hidden = !color;
      if (color) r.sw.style.background = d.value;
    }
    edit(d) {
      if (this.editor && !this.editor.finish(false)) this.editor.finish(true);
      const r = this.rowOf.get(d);
      if (!r) return;
      const { value } = r;
      const start = d.value, startOn = d.on;
      const model = d.model, startText = model.rule.style.cssText;
      const startAttribute = model.inlineEl?.getAttribute("style") ?? null;
      const cancelStyle = this.store.scratch(model, startText);
      let editorWrite = startText;
      const absorbOutside = () => {
        const live = model.rule.style.cssText;
        for (const { prop, value: value2, priority } of this.store.styleChanges(this.store.scratch(model, editorWrite), this.store.scratch(model, live))) {
          this.store.writeProperty(cancelStyle, prop, value2, priority);
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
      const size = () => {
        field.style.inlineSize = `calc(${Math.max(field.value.length, 1) + 1}ch + 12px)`;
      };
      const validate = () => {
        absorbOutside();
        const valid = this.change(d, field.value);
        if (valid) editorWrite = model.rule.style.cssText;
        field.setAttribute("aria-invalid", String(!valid));
        field.setCustomValidity(valid ? "" : "Enter a valid CSS value.");
        this.status.textContent = valid ? "" : "Invalid CSS value. Correct it, or press Escape to cancel.";
        return valid;
      };
      const set = (v) => {
        field.value = v;
        size();
        return validate();
      };
      field.addEventListener("input", () => {
        size();
        validate();
      });
      field.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          finish(false, true);
        } else if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          finish(true, true);
        } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          const m = field.value.match(/-?\d*\.?\d+/);
          if (!m) return;
          e.preventDefault();
          const step = (e.key === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 10 : e.altKey ? 0.1 : 1);
          const n = Math.round((parseFloat(m[0]) + step) * 1e3) / 1e3;
          set(field.value.slice(0, m.index) + n + field.value.slice(m.index + m[0].length));
        }
      });
      let finished = false;
      const keys = new AbortController();
      const finish = (cancel, restoreFocus = false) => {
        if (finished) return true;
        if (!cancel && !validate()) {
          if (restoreFocus) field.focus();
          return false;
        }
        finished = true;
        keys.abort();
        if (!cancel && (d.value !== start || d.on !== startOn)) this.record([{ d, before: { value: start, on: startOn, important: d.important }, after: this.state(d) }]);
        if (cancel) {
          absorbOutside();
          this.store.rebaseBaseline(model);
          if (model.inlineEl && cancelStyle.cssText === startText) {
            if (startAttribute == null) model.inlineEl.removeAttribute("style");
            else model.inlineEl.setAttribute("style", startAttribute);
          } else model.rule.style.cssText = cancelStyle.cssText;
          d.value = start;
          d.on = startOn;
          const originally = this.store.scratch(model, startText);
          if (startOn && (originally.getPropertyValue(d.prop) !== cancelStyle.getPropertyValue(d.prop) || originally.getPropertyPriority(d.prop) !== cancelStyle.getPropertyPriority(d.prop))) {
            d.value = cancelStyle.getPropertyValue(d.prop) || start;
            d.on = cancelStyle.getPropertyValue(d.prop) !== "";
            d.important = cancelStyle.getPropertyPriority(d.prop) === "important";
          }
          model.sourceText = this.store.scratch(model, this.store.declarationText(model)).cssText;
          model.lastApplied = model.rule.style.cssText;
          this.queueLoad();
          this.markHits();
          this.paint();
        }
        this.status.textContent = "";
        field.replaceWith(value);
        this.syncRow(d);
        if (this.editor?.field === field) this.editor = null;
        if (restoreFocus) value.focus();
        if (this.pendingCssRender) {
          this.pendingCssRender = false;
          this.renderCss();
          if (restoreFocus) this.rowOf.get(d)?.value.focus();
        }
        return true;
      };
      addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        e.preventDefault();
        e.stopImmediatePropagation();
        finish(true, true);
      }, { capture: true, signal: keys.signal });
      this.editor = { field, finish, declaration: d };
      field.addEventListener("blur", () => finish(false));
      size();
      value.replaceWith(field);
      field.focus();
      field.select();
    }
    change(d, value) {
      value = value.trim();
      if (!value || !this.store.validValue(d, value)) return false;
      d.value = value;
      d.on = true;
      this.apply(d);
      return true;
    }
    apply(d) {
      this.store.write(d);
      for (const entry of d.model.decls) if (entry.type === "decl") this.syncRow(entry);
      this.markHits();
      this.paint();
    }
    /* ---------- undo: the CSS changes, stepped back one at a time ---------- */
    state(d) {
      return { value: d.value, on: d.on, important: d.important };
    }
    // a snapshot: undo judges the step against it, not against the model the page may have changed since
    record(entry) {
      this.history.push(entry);
    }
    undo() {
      const entry = this.history.pop();
      if (!entry) return;
      this.editor?.finish(true);
      for (const { d, before, after } of [...entry].reverse()) {
        const model = d.model;
        if (!this.store.modelAvailable(model) || !model.decls.includes(d)) continue;
        const expected = this.store.scratch(model, this.store.declarationText(model, { d, state: after }));
        if (model.rule.style.getPropertyValue(d.prop) !== expected.getPropertyValue(d.prop) || model.rule.style.getPropertyPriority(d.prop) !== expected.getPropertyPriority(d.prop)) continue;
        d.value = before.value;
        d.on = before.on;
        d.important = before.important;
        this.apply(d);
        this.syncRow(d);
      }
    }
    resetAll() {
      this.editor?.finish(true);
      this.setPicking(false);
      this.setSizing(false);
      this.setMeasuring(false);
      this.sizeResetAll();
      this.reset();
      this.clearMarks();
    }
    clearPicks() {
      for (const [, p] of this.picks) {
        this.setPickedRow(p.row, false);
        p.row.style.removeProperty("--accent");
      }
      this.picks.clear();
      this.focusEl = null;
      this.markHits();
      this.paint();
    }
    clearMarks() {
      this.clearPicks();
      this.pins.clear();
      this.hover = null;
      this.markHits();
      for (const r of this.rowOf.values()) {
        r.row.classList.remove("on");
        r.row.querySelector(".t")?.setAttribute("aria-pressed", "false");
      }
      this.paint();
    }
    reset() {
      this.history.clear();
      for (const model of this.store.dirtyModels) if (!this.store.modelAvailable(model)) this.store.dirtyModels.delete(model);
      for (const model of this.store.dirtyModels) {
        const touched = model.rule.style.cssText !== model.lastApplied;
        this.store.rebaseBaseline(model);
        if (model.inlineEl && model.originalAttribute == null) model.inlineEl.removeAttribute("style");
        else if (model.inlineEl) model.inlineEl.setAttribute("style", model.originalAttribute);
        else model.rule.style.cssText = model.baseline;
        for (const d of model.decls) if (d.type === "decl") {
          d.value = d.orig;
          d.on = true;
          this.syncRow(d);
        }
        model.lastApplied = model.rule.style.cssText;
        model.sourceText = model.lastApplied;
        if (touched) {
          this.store.dirtyModels.delete(model);
          this.store.reconcileModel(model);
        }
      }
      this.store.dirtyModels.clear();
      this.queueLoad();
      this.paint();
    }
  };
  if (!customElements.get("fm-inspector")) {
    customElements.define("fm-inspector", Inspector);
    const mount = () => {
      if (!document.querySelector("fm-inspector")) document.body.append(document.createElement("fm-inspector"));
    };
    if (document.body) mount();
    else document.addEventListener("DOMContentLoaded", mount, { once: true });
  }
})();

// Copyright 2026 Alper Donmez. All rights reserved.
