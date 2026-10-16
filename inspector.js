// inspector.js v0.2.5

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
    --layout: light-dark(#0e7490, #22d3ee); /* a computed value the layout resolved, no rule behind it: the cascade stack's teal rows */
    --css: light-dark(#c026d3, #e879f9); /* a hovered or pinned declaration, on the page and in its row: a family apart from the picks' blues */
    --chip: light-dark(#1f2430, #ffffff);
    --chip-text: light-dark(#ffffff, #1f2430);
    --chip-name: light-dark(#93c5fd, #2563eb);
    --font: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    --mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    --shadow: 0 12px 40px rgba(0, 0, 0, 0.18);
    color-scheme: light dark;
    position: fixed;
    inset-block-start: 16px;
    inset-inline-start: auto;
    inset-block-end: auto;
    inset-inline-end: 60px; /* the box parks beside the rail */
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

  /* the rail: the tools' icons on the screen's end edge; a tool's own things live in its box or on the page */
  .rail {
    position: fixed;
    inset-block-start: 50%;
    inset-inline-end: 0;
    transform: translateY(-50%);
    z-index: 3;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 10px 0;
    inline-size: 48px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-inline-end: 0;
    border-radius: 14px 0 0 14px;
    box-shadow: var(--shadow);
  }
  .rail button {
    position: relative;
    inline-size: 36px;
    block-size: 36px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--muted);
    border-radius: 10px;
  }
  .rail button svg { inline-size: 20px; block-size: 20px; }
  .rail button:hover { color: var(--text); background: var(--bg-2); }
  .rail button[aria-pressed="true"], .rail button[aria-expanded="true"] { color: var(--accent); background: var(--wash); }
  .rail button:disabled { opacity: 0.35; cursor: default; background: none; }
  .rail .sep { inline-size: 24px; block-size: 1px; background: var(--border); margin: 2px 0; }
  /* the icon's name on hover or keyboard focus, beside the rail (above the strip on phones) */
  .rail button[data-tip]:hover::after, .rail button[data-tip]:focus-visible::after {
    content: attr(data-tip);
    position: absolute;
    inset-inline-end: calc(100% + 10px);
    inset-block-start: 50%;
    transform: translateY(-50%);
    padding: 4px 8px;
    font-size: 12px;
    font-weight: 600;
    line-height: 1.2;
    color: var(--chip-text);
    background: var(--chip);
    border-radius: 6px;
    white-space: nowrap;
    pointer-events: none;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.18);
  }
  .rail .bye:hover { color: var(--dist); }

  .panel:focus { outline: none; }
  .panel {
    position: relative; /* paints over the overlay */
    z-index: 2;
    display: none;
    flex-direction: column;
    inline-size: min(30rem, calc(100vw - 76px)); /* the CSS box's five controls on one row */
    block-size: min(70vh, 40rem); /* one height for both views; the user's own resize overrides it */
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 14px;
    box-shadow: var(--shadow);
    overflow: hidden;
  }
  :host([open]) .panel { display: flex; }
  /* the second box: the CSS view opened from the resize view's hold, beside the box, its own head and close; the box's drag moves the host, this one moves itself */
  .panel.second { position: fixed; inset-block-start: 8px; inset-inline-start: 8px; z-index: 3; }
  .panel.second:not([hidden]) { display: flex; }
  .panel.second .head { padding-inline-start: 12px; font-size: 12px; font-weight: 600; color: var(--text); }
  .panel.second .p2title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .head {
    position: relative;
    display: flex;
    flex-wrap: wrap; /* the box's controls take a second row in a narrow box */
    align-items: center;
    gap: 2px;
    flex: none; /* never squeezed by the body */
    min-block-size: 29px; /* a 28px grab bar plus the 1px rule under it (border-box); a tool's own controls land here */
    padding: 3px 30px 3px 6px;
    border-block-end: 1px solid var(--border);
    cursor: grab;
    touch-action: none;
    user-select: none;
  }
  :host([dragging]) .head { cursor: grabbing; }

  /* resize handles: thin strips along the panel's edges and squares on its corners, straddling the border */
  .rz { position: absolute; display: none; touch-action: none; z-index: 3; }
  :host([open]) .rz { display: block; }
  /* a folded box: the head alone, the body and the resize edges away until the next click on the head */
  .panel[data-folded] { block-size: auto !important; min-block-size: 0; }
  .panel[data-folded] .body, .panel[data-folded] .status { display: none; }
  :host([open]) .panel[data-folded] ~ .rz { display: none; }
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

  /* the resize tool's own view in the box: the chosen element's size and the reason a drag was held */
  .size .qname .wval { color: var(--accent); font-weight: 700; }
  .size .wnow { padding: 0 12px 6px; color: var(--text); font-weight: 700; } .size .wnow:empty { display: none; } /* the size now, under the size the element was chosen at, with the difference per axis, 0 × 0px before a resize */
  .size .wnow .wdiff { margin-inline-start: 8px; font-weight: 400; color: var(--muted); }
  .size .qname:has(.wval:empty) { display: none; } /* no element chosen yet: the hint alone */
  .size .shint { display: none; padding-block-start: 12px; } .size:has(.wval:empty) .shint { display: block; }
  .wblock { padding: 4px 12px; font-size: 12px; color: var(--dist); white-space: normal; } /* the reason a resize was held, in the hold's red; the held row lights the same red in the CSS view */
  .wblock:empty { display: none; }
  .wblock { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; }
  .hdecl { display: inline-flex; align-items: center; gap: 8px; font-weight: 700; cursor: pointer; } /* the holding declaration with its tick, the CSS row's look in the hold's red */
  .hdecl input[type="checkbox"] { inline-size: 16px; block-size: 16px; margin: 0; accent-color: var(--dist); cursor: pointer; }
  .hdecl.off .t, .hdecl.off .v { text-decoration: line-through; opacity: 0.6; }
  .wgo { font: inherit; font-size: 11px; font-weight: 600; color: var(--accent); text-decoration: underline; text-underline-offset: 2px; cursor: pointer; } /* the door to the element's whole CSS in the second box */
  /* the declaration that kept a resize from landing: a red row, its name and value in red */
  .d.block { background: color-mix(in srgb, var(--dist) 14%, transparent); box-shadow: inset 3px 0 0 var(--dist), inset 0 0 0 1px color-mix(in srgb, var(--dist) 50%, transparent); }
  .d.block .t, .d.block .v, .d.block .x { color: var(--dist); font-weight: 700; }
  .grp:has(.d.block) .gh .sel { color: var(--dist); }
  .hd { position: fixed; z-index: 2; display: none; inline-size: 32px; block-size: 32px; margin: -16px 0 0 -16px; padding: 0; background: transparent; border: 0; border-radius: 4px; cursor: ew-resize; touch-action: none; } /* a button: Left/Right arrows step the width */
  .hd::after { content: ""; position: absolute; inset: 8px; background: var(--accent); border: 2px solid #fff; border-radius: 4px; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3); }
  .hd:disabled { cursor: not-allowed; opacity: 0.5; }
  :host([sizing]) .hd[data-on] { display: block; }
  /* beside the handle, once the element has been resized: this element back to its own size */
  .hreset { position: fixed; z-index: 2; display: none; block-size: 20px; padding: 0 7px; font-family: var(--mono); font-size: 10px; font-weight: 600; color: var(--muted); background: var(--bg); border: 1px solid var(--border); border-radius: 999px; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.18); }
  .hreset:hover { color: var(--text); background: var(--bg-2); }
  :host([sizing]) .hreset[data-on] { display: inline-flex; align-items: center; }
  .status { padding: 4px 12px; font-size: 12px; color: var(--dist); white-space: normal; }
  .status:empty { display: none; }
  .head .spacer { flex: 1 1 0; min-inline-size: 0; }
  .head .blocks { flex: 1 1 100%; display: flex; flex-wrap: wrap; gap: 2px; } /* the CSS blocks' row, under the scope pair */
  .head .blocks:not(:has(button:not([hidden]))) { display: none; } /* the HTML view has no blocks: no empty second row */
  /* the box's own controls: what it shows (the selected element alone, or all), and for CSS the browser's defaults under the author's rules */
  .tbtn { block-size: 22px; padding: 0 6px; font-size: 11px; font-weight: 600; color: var(--muted); border-radius: 6px; white-space: nowrap; }
  .tbtn:hover { color: var(--text); background: var(--bg-2); }
  .tbtn[aria-pressed="true"] { color: var(--accent); background: var(--wash); }
  .tbtn:disabled { opacity: 0.35; cursor: default; background: none; }
  .close { position: absolute; inset-inline-end: 4px; inset-block-start: 3px; inline-size: 22px; block-size: 22px; display: inline-flex; align-items: center; justify-content: center; color: var(--muted); border-radius: 6px; }
  .close:hover { color: var(--text); background: var(--bg-2); }
  .close svg { inline-size: 14px; block-size: 14px; }

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
  .row.nc { padding-inline-start: calc(8px + var(--d) * 14px + 18px); } /* a closing tag or a text row (no caret): the caret's width, so its text lines up with the opening tag; a class, not :has(), which cost a 3000-element page seconds per style pass */
  .row:hover { background: var(--bg-2); }
  .row[data-scope] { border-color: var(--accent); } /* the chosen element's own row, among its parent, siblings or children */
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
  .lim { padding: 0 12px 6px 36px; font-size: 11px; line-height: 1.4; color: var(--muted); opacity: 0.85; } /* what sets a size: a faint line under the row that holds it, or in the layout block */
  .cm + .lim { padding-inline-start: 12px; }
  .empty { padding: 16px 12px; color: var(--muted); font-family: var(--font); }
  .lim .rp { color: var(--attr); } /* a reason's parts: property, value, element name in the rows' own colours */
  .lim .rv { color: var(--val); }
  .lim .re { color: var(--tag); }
  .lim.lhead { padding-block-start: 6px; padding-inline-start: 12px; color: var(--text); opacity: 1; } /* an element's head in the size ladder, its two lines indented under it */
  .lim.lhead .lkin { margin-inline-start: 8px; font-size: 10px; color: var(--muted); } /* parent, grandparent, … */
  hr.lsep { margin: 8px 12px 2px; border: 0; border-block-start: 1px solid var(--border); } /* the element above, its parents below */
  .lim.lhead + .empty { padding: 0 12px 8px; font-size: 11px; line-height: 1.4; } /* the parents' head line's explanation */
  .d .src { display: inline-flex; align-items: center; gap: 4px; margin-inline-start: 8px; font-size: 10px; white-space: nowrap; color: var(--muted); } /* where a computed value comes from: one piece, never broken mid-note */
  .d.wn { flex-wrap: wrap; row-gap: 0; } /* a note that does not fit drops whole to a second line under the declaration */
  .d.na[class*="src-"] { opacity: 1; } /* the stack's rows keep full ink: the source is the colour, an overridden row is struck through */
  .src-author, .src-author .src { color: var(--accent); } /* one colour per source: the stack's rows, their notes, the source links and the narrowed stack's line */
  .src-browser, .src-browser .src { color: var(--flex); }
  .src-inherited, .src-inherited .src { color: var(--attr); }
  .src-os, .src-os .src { color: var(--pad-ink); } /* an initial value the OS and the user agent set: the default font, its size, the text colour */
  .src-layout, .src-layout .src { color: var(--layout); }
  .src-currentcolor, .src-currentcolor .src { color: var(--css); } /* a colour property with no colour of its own, the keyword row and its computed colour both: it follows color */
  .srcs { display: flex; flex-wrap: wrap; gap: 2px 12px; padding: 2px 12px 6px; } /* the source links under the stack's head, and the box links over the size ladder */
  .cm + .srcs, .srcs:first-child { padding-block-start: 10px; }
  .srcb { font: inherit; font-size: 11px; cursor: pointer; opacity: 0.85; } /* each link in its source's colour, All and Initial in the panel's ink; All leads and is lit at rest */
  .srcb:hover, .srcb[aria-pressed="true"] { opacity: 1; text-decoration: underline; text-underline-offset: 2px; }
  .srcb[aria-pressed="true"] { font-weight: 700; }
  .empty.srcnote { padding: 0 12px 8px; font-size: 11px; line-height: 1.4; } /* the narrowed stack's line, in the source's colour */
  .whyb { display: inline-flex; align-items: center; justify-content: center; flex: none; inline-size: 16px; block-size: 16px; border-radius: 50%; color: inherit; opacity: 0.8; cursor: pointer; } /* the ! after a source note */
  .whyb svg { inline-size: 12px; block-size: 12px; }
  .whyb:hover, .whyb[aria-expanded="true"] { opacity: 1; background: color-mix(in srgb, currentColor 14%, transparent); }
  .d.wo { position: relative; }
  .why { position: absolute; inset-block-start: calc(100% - 2px); inset-inline-start: 12px; z-index: 3; max-inline-size: 26rem; padding: 6px 9px; font-family: var(--font); font-size: 11px; line-height: 1.4; white-space: normal; text-decoration: none; color: var(--text); background: var(--bg); border: 1px solid var(--border); border-radius: 6px; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.14); } /* the explanation, a tooltip under the row in the panel's own ink */
  .d.na.over { text-decoration: line-through; text-decoration-color: color-mix(in srgb, currentColor 60%, transparent); }
  .d.na.over + .d.na { margin-block-start: -2px; }
  .cm + .lim.lhead { padding-block-start: 0; }
  .hc { padding: 12px; font-size: 12px; line-height: 1.5; } /* Show Content: the element's content by kind */
  .hc .hch { margin-block-end: 6px; }
  .hc .hcpic { display: block; max-inline-size: 100%; max-block-size: 12rem; margin-block-end: 8px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg-2); }
  .hc .hcr { display: flex; gap: 8px; align-items: baseline; min-inline-size: 0; }
  .hc .hcl { flex: none; inline-size: 5.5em; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--muted); }
  .hc .hcv, .hc a { min-inline-size: 0; overflow-wrap: anywhere; white-space: normal; font-family: var(--font); color: var(--text); }
  .hc a { color: var(--tag); text-decoration: underline; text-underline-offset: 2px; }
  .quick .qname, .size .qname { padding: 12px 12px 6px; color: var(--text); } .quick .qname .re { color: var(--tag); } /* the quick view: the hovered element's name and size, its box model, then what sets its width and height; the resize view: the chosen element's live size */
  .quick .lim { padding-inline-start: 12px; }
  .bm { padding: 6px 12px 10px; font-size: 11px; line-height: 1.3; } /* the picture follows the box's width */
  .bm-layer { position: relative; display: grid; grid-template-columns: auto 1fr auto; grid-template-rows: auto 1fr auto; align-items: center; justify-items: center; gap: 2px 6px; padding: 16px 6px 6px; border: 1px solid transparent; border-radius: 4px; color: var(--text); }
  .bm-margin { background: var(--mar); border-color: var(--mar-ink); border-style: dashed; }
  .bm-border { background: var(--bord); border-color: color-mix(in srgb, var(--flex) 60%, transparent); }
  .bm-padding { background: var(--pad); border-color: var(--pad-ink); }
  .bm-content { grid-area: 2 / 2; padding: 10px 14px; min-inline-size: 7em; text-align: center; color: var(--tag); background: color-mix(in srgb, var(--tag) 12%, transparent); border-radius: 3px; }
  .bm-layer > .bm-layer { grid-area: 2 / 2; inline-size: 100%; }
  .bm-label { position: absolute; inset-block-start: 2px; inset-inline-start: 6px; font-size: 10px; color: var(--muted); }
  .bm-t { grid-area: 1 / 2; } .bm-l { grid-area: 2 / 1; } .bm-r { grid-area: 2 / 3; } .bm-b { grid-area: 3 / 2; }

  /* the overlay: fixed boxes painted over the page's elements */
  .ov { pointer-events: none; font-family: var(--mono); font-size: 11px; line-height: 1; }
  .pick-surface { display: none; position: fixed; inset: 0; z-index: 1; cursor: crosshair; touch-action: pan-x pan-y pinch-zoom; } /* a transparent shield over the page: it takes the pointer input, the page never does; pans still scroll */
  :host([picking]) .pick-surface, :host([sizing]) .pick-surface, :host([lens]) .pick-surface { display: block; }
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
  :host([picking]) .state, :host([sizing]) .state, :host([lens]) .state { display: inline-flex; }

  @media (max-width: 480px) {
    /* phones: the open panel is a sheet fixed to the screen's foot, full width, rising from below; no drag, no resize */
    :host { font-size: 12px; }
    :host([open]) { inset: auto 0 52px 0 !important; } /* the sheet stands on the strip */
    :host(:not([open])) { inset: auto auto 52px 0 !important; }
    .rail { inset: auto 0 0 0; transform: none; flex-direction: row; justify-content: space-around; gap: 0; padding: 4px; inline-size: auto; block-size: 52px; border: 0; border-block-start: 1px solid var(--border); border-radius: 0; box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.12); }
    .rail .sep { inline-size: 1px; block-size: 24px; margin: 0; }
    .rail button { inline-size: 34px; block-size: 34px; }
    .rail button[data-tip]:hover::after, .rail button[data-tip]:focus-visible::after { inset-inline-end: auto; inset-block-start: auto; inset-block-end: calc(100% + 8px); inset-inline-start: 50%; transform: translateX(-50%); }
    .panel { inline-size: 100vw !important; block-size: var(--sheet, 50vh) !important; max-block-size: 50vh !important; border-radius: 14px 14px 0 0; border-block-end: 0; box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.18); }
    :host([open]) .rz { display: none; }
    .head { min-block-size: 41px; padding-block-start: 12px; cursor: default; flex: none; }
    .close { inset-block-start: 12px; }
    .head button { touch-action: none; } /* a pull that starts on the close button is still a pull */
    .body { min-block-size: 0; }
    .head::before { content: ""; position: absolute; inset-block-start: 5px; inset-inline-start: 50%; inline-size: 36px; block-size: 4px; margin-inline-start: -18px; border-radius: 999px; background: var(--border); }
    .view { font-size: 11px; }
    .state { inset-block-end: auto; inset-block-start: 8px; font-size: 12px; padding: 6px 12px; }
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
  var STROKE = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';
  var ICON_PICK = `<svg ${STROKE}><path d="M21 11V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6"/><path d="m12 12 4.5 10 1.8-4.2L22.5 16Z"/></svg>`;
  var ICON_CODE = `<svg ${STROKE}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`;
  var ICON_BRUSH = `<svg ${STROKE}><path d="m14.622 17.897-10.68-2.913"/><path d="M18.376 2.622a1 1 0 1 1 3.002 3.002L17.36 9.643a.5.5 0 0 0 0 .707l.944.944a2.41 2.41 0 0 1 0 3.408l-.944.944a.5.5 0 0 1-.707 0L8.354 7.348a.5.5 0 0 1 0-.707l.944-.944a2.41 2.41 0 0 1 3.408 0l.944.944a.5.5 0 0 0 .707 0z"/><path d="M9 8c-1.804 2.71-3.97 3.46-6.583 3.948a.507.507 0 0 0-.302.819l7.32 8.883a1 1 0 0 0 1.185.204C12.735 20.405 16 16.792 16 15"/></svg>`;
  var ICON_SIZE = `<svg ${STROKE}><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>`;
  var ICON_RULER = `<svg ${STROKE}><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/></svg>`;
  var ICON_CLEAR = `<svg ${STROKE}><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>`;
  var ICON_X = `<svg ${STROKE}><path d="M18 6 6 18M6 6l12 12"/></svg>`;
  var MARKUP = `
  <div class="ov" aria-hidden="true"></div>
  <div class="pick-surface" aria-hidden="true"></div>
  <div class="state" aria-hidden="true">Select an element · Esc to cancel</div>
  <button type="button" class="hd" aria-label="Adjust the element's width" title="Drag sideways, or Left/Right arrows (Shift: 10px)"></button>
  <button type="button" class="hreset" title="This element back to its own size, every CSS edit back">Reset</button>
  <nav class="rail" aria-label="Code inspector">
    <button class="pickbtn" type="button" aria-pressed="false" aria-label="Quick view" data-tip="Quick view">${ICON_PICK}</button>
    <button class="htmlbtn" type="button" aria-expanded="false" aria-controls="panel" aria-label="HTML" data-tip="HTML">${ICON_CODE}</button>
    <button class="cssbtn" type="button" aria-expanded="false" aria-controls="panel" aria-label="CSS" data-tip="CSS">${ICON_BRUSH}</button>
    <span class="sep" aria-hidden="true"></span>
    <button class="sizebtn" type="button" aria-pressed="false" aria-label="Resize" data-tip="Resize">${ICON_SIZE}</button>
    <button class="measure" type="button" aria-pressed="false" aria-label="Show all sizes" data-tip="Show all sizes">${ICON_RULER}</button>
    <button class="reset" type="button" aria-label="Clear all" data-tip="Clear all">${ICON_CLEAR}</button>
    <span class="sep" aria-hidden="true"></span>
    <button class="bye" type="button" aria-label="Remove" data-tip="Remove">${ICON_X}</button>
  </nav>
  <section class="panel" id="panel" aria-label="Code" tabindex="-1">
    <div class="head">
      <button class="vscope tbtn" type="button" aria-pressed="true">Selected Element</button>
      <button class="vall tbtn" type="button" aria-pressed="false">Show All</button>
      <span class="spacer"></span>
      <div class="blocks">
        <button class="vlimits tbtn" type="button" aria-pressed="false" hidden>Show Size</button>
        <button class="vcascade tbtn" type="button" aria-pressed="false" hidden>Show Inherited</button>
        <button class="vdefaults tbtn" type="button" aria-pressed="false" hidden>Show Defaults</button>
        <button class="vrender tbtn" type="button" aria-pressed="false" hidden>Show Computed</button>
        <button class="vinitials tbtn" type="button" aria-pressed="false" hidden>Show Initials</button>
        <button class="vparent tbtn" type="button" aria-pressed="false" hidden>Show Parent</button>
        <button class="vchildren tbtn" type="button" aria-pressed="false" hidden>Show Children</button>
        <button class="vsiblings tbtn" type="button" aria-pressed="false" hidden>Show Siblings</button>
        <button class="vcontent tbtn" type="button" aria-pressed="false" hidden>Show Content</button>
      </div>
      <button class="close" type="button" aria-label="Close">${ICON_X}</button>
    </div>
    <div class="status" role="status" aria-live="polite"></div>
    <div class="body">
      <div class="view" id="view-html" role="region" aria-label="HTML"></div>
      <div class="view" id="view-css" role="region" aria-label="CSS" hidden></div>
      <div class="view quick" id="view-quick" role="region" aria-label="Quick view" hidden></div>
      <div class="view size" id="view-size" role="region" aria-label="Resize" hidden>
        <div class="qname"><span class="wval"></span></div>
        <div class="wnow"></div>
        <div class="wblock" role="status"></div>
        <div class="empty shint">Click an element on the page. Drag its corner handle sideways, or press Left / Right (Shift: 10px). The rule that holds a drag lights red in the CSS view and reads here.</div>
      </div>
    </div>
  </section>
  ${["n", "s", "e", "w", "ne", "nw", "se", "sw"].map((e) => `<div class="rz ${e}" data-edge="${e}" aria-hidden="true"></div>`).join("")}
  <section class="panel second" id="panel2" aria-label="CSS" tabindex="-1" hidden>
    <div class="head"><span class="p2title"></span><button class="close p2close" type="button" aria-label="Close">${ICON_X}</button></div>
    <div class="body"></div>
  </section>`;

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
  function rich(parts) {
    const f = document.createDocumentFragment();
    for (const part of parts) f.append(typeof part === "string" ? part : span(part.p ? "rp" : part.v ? "rv" : "re", part.p ?? part.v ?? part.e));
    return f;
  }
  function sizeRows(entry, head = true, kin = "") {
    const rows = [];
    if (head) {
      const n = document.createElement("div");
      n.className = "lim lhead";
      n.append(span("re", entry.name), ` ${fmt(entry.w)} × ${fmt(entry.h)}px`);
      if (kin) n.append(span("lkin", kin));
      rows.push(n);
    }
    for (const [word, size, why] of [["width", entry.w, entry.width], ["height", entry.h, entry.height]]) {
      const n = document.createElement("div");
      n.className = "lim";
      n.append(span("rp", word), " ", span("rv", fmt(size) + "px"), ": ", rich(why));
      rows.push(n);
    }
    return rows;
  }
  function span(cls, text) {
    const s = document.createElement("span");
    s.className = cls;
    s.textContent = text;
    return s;
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

  // src/tools/size-explain.js
  var sizeProp = (el) => /^(vertical|sideways)/.test(getComputedStyle(el).writingMode) ? "block-size" : "inline-size";
  var extraOf = (cs) => cs.boxSizing === "content-box" ? num(cs.paddingLeft) + num(cs.paddingRight) + num(cs.borderLeftWidth) + num(cs.borderRightWidth) : 0;
  function sizeOf(el, attr, prop = sizeProp(el)) {
    const style = document.createElement("div").style;
    style.cssText = attr || "";
    return { prop, value: style.getPropertyValue(prop), priority: style.getPropertyPriority(prop), cssText: style.cssText };
  }
  function resizeSupported(el) {
    for (let node = el; node; node = node.parentElement) {
      const cs = getComputedStyle(node);
      if (cs.transform !== "none" || cs.zoom && cs.zoom !== "normal" && num(cs.zoom) !== 1) return false;
    }
    return true;
  }
  function contentNeed(el) {
    const cs = getComputedStyle(el), out = { x: 0, y: 0 };
    if (cs.display === "inline" || !el.scrollWidth) return out;
    if (cs.overflowX === "visible") out.x = el.scrollWidth - el.clientWidth;
    if (cs.overflowY === "visible") out.y = el.scrollHeight - el.clientHeight;
    return out;
  }
  function overflow(el, parent) {
    const r = el.getBoundingClientRect(), pr = parent.getBoundingClientRect(), pcs = getComputedStyle(parent), cs = getComputedStyle(el);
    const right = pr.right - num(pcs.paddingRight) - num(pcs.borderRightWidth), bottom = pr.bottom - num(pcs.paddingBottom) - num(pcs.borderBottomWidth);
    return { x: r.right + Math.max(num(cs.marginRight), 0) - right, y: r.bottom + Math.max(num(cs.marginBottom), 0) - bottom };
  }
  function trackTokens(value, limit = 2048) {
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
      const inner = trackTokens(repeat[2], limit - out.length);
      if (!inner.length) continue;
      const count = /^\d+$/.test(repeat[1]) ? Math.min(Number(repeat[1]), Math.ceil((limit - out.length) / inner.length)) : 1;
      for (let n = 0; n < count && out.length < limit; n++) out.push(...inner.slice(0, limit - out.length));
    }
    return out;
  }
  function declaredOn(store, el, props) {
    const models = store.models.filter((m) => !m.inlineEl && store.matchModel(m, [el]).length > 0);
    for (const m of models.reverse()) for (const d of [...m.decls].reverse()) if (d.type === "decl" && d.on && d.live && props.includes(d.prop)) return d;
    return null;
  }
  function sizeLimits(store, el, cs) {
    const parent = el.parentElement;
    const out = { w: Infinity, whyW: null, parent: null };
    if (!parent || /absolute|fixed/.test(cs.position)) return out;
    out.parent = parent;
    const pcs = getComputedStyle(parent);
    if (/grid/.test(pcs.display)) {
      const decl = declaredOn(store, parent, ["grid-template-columns", "grid-template", "grid"]);
      const sizes = pcs.gridTemplateColumns.split(" ").map(num).filter((n) => n > 0), gap = num(pcs.columnGap);
      if (decl && sizes.length) {
        const tokens = trackTokens(decl.value), pr = parent.getBoundingClientRect(), r = el.getBoundingClientRect();
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
  var contentWidth = (el) => {
    const cs = getComputedStyle(el);
    return el.getBoundingClientRect().width - num(cs.paddingLeft) - num(cs.paddingRight) - num(cs.borderLeftWidth) - num(cs.borderRightWidth);
  };
  function parentBase(store, el) {
    const parent = el.parentElement, cs = getComputedStyle(el);
    if (!parent || /absolute|fixed/.test(cs.position) || cs.display === "inline") return 0;
    const pcs = getComputedStyle(parent);
    if (/grid/.test(pcs.display) && sizeLimits(store, el, cs).whyW !== "grid") return 0;
    return contentWidth(parent);
  }
  var reaches = (store, m, target) => !m.inlineEl && m.decls.some((d) => d.type === "decl" && d.on) && store.matchModel(m, [target]).length > 0;
  var rulesOf = (store, target) => [...store.models.filter((m) => reaches(store, m, target)), ...store.models.filter((m) => m.inlineEl === target)];
  var find = (models, props) => {
    for (const m of [...models].reverse()) for (const d of [...m.decls].reverse()) if (d.type === "decl" && d.on && d.live && props.includes(d.prop)) return d;
    return null;
  };
  var say = (d) => [{ p: d.prop }, ": ", { v: d.value }];
  var E = (el) => ({ e: name(el) });
  function widthWhy(store, a) {
    const acs = getComputedStyle(a), ar = a.getBoundingClientRect(), own = rulesOf(store, a), parent = a.parentElement;
    if (a === document.documentElement || a === document.body) {
      const w = find(own, ["width", "inline-size", "max-width", "max-inline-size"]);
      return w ? say(w) : ["the viewport"];
    }
    const pad = extraOf(acs);
    const maxD = find(own, ["max-width", "max-inline-size"]), minD = find(own, ["min-width", "min-inline-size"]), sizeD = find(own, ["width", "inline-size"]);
    if (acs.maxWidth !== "none" && Math.abs(num(acs.maxWidth) + pad - ar.width) <= 1) return maxD ? say(maxD) : [{ p: "max-width" }, ": ", { v: acs.maxWidth }];
    if (acs.minWidth !== "auto" && num(acs.minWidth) > 0 && Math.abs(num(acs.minWidth) + pad - ar.width) <= 1) return minD ? say(minD) : [{ p: "min-width" }, ": ", { v: acs.minWidth }];
    if (sizeD && !/^(auto|fit-content|max-content|min-content)$/.test(sizeD.value)) return /%$/.test(sizeD.value) && parent ? [...say(sizeD), " of ", E(parent)] : say(sizeD);
    if (!parent) return ["the viewport"];
    if (/absolute|fixed/.test(acs.position)) return acs.left !== "auto" && acs.right !== "auto" ? ["both insets"] : ["its content"];
    const pcs = getComputedStyle(parent), limit = sizeLimits(store, a, acs);
    if (limit.whyW === "grid") {
      const g = find(rulesOf(store, parent), ["grid-template-columns", "grid-template", "grid"]);
      return [E(parent), " grid track: ", { v: g ? g.value : fmt(limit.w) + "px" }];
    }
    const shrinks = /inline-block|inline-flex|inline-grid|table/.test(acs.display) || acs.float !== "none" || /flex/.test(pcs.display) && !/column/.test(pcs.flexDirection) && num(acs.flexGrow) === 0 || /grid/.test(pcs.display) && /start|end|center/.test(pcs.justifyItems) && acs.justifySelf === "auto" || /start|end|center|self/.test(acs.justifySelf);
    if (shrinks) {
      if (/grid/.test(pcs.display)) {
        const g = find(rulesOf(store, parent), ["place-items", "justify-items"]);
        return ["hugs its content: ", E(parent), " grid", ...g ? [": ", ...say(g)] : []];
      }
      if (/flex/.test(pcs.display)) return ["hugs its content: a flex item of ", E(parent), " with no ", { p: "flex-grow" }];
      return ["hugs its content (", { v: acs.float !== "none" ? "float" : acs.display }, ")"];
    }
    if (/^inline$/.test(acs.display)) return ["its content (", { v: "inline" }, ")"];
    const inner = contentWidth(parent), outer = ar.width + Math.max(num(acs.marginLeft), 0) + Math.max(num(acs.marginRight), 0);
    if (Math.abs(inner - outer) <= 1) return ["fills ", E(parent)];
    return [E(parent), " leaves ", { v: fmt(inner) + "px" }, "; the margins take the rest"];
  }
  function heightWhy(store, a) {
    const acs = getComputedStyle(a), ar = a.getBoundingClientRect(), own = rulesOf(store, a), parent = a.parentElement;
    const pad = acs.boxSizing === "content-box" ? num(acs.paddingTop) + num(acs.paddingBottom) + num(acs.borderTopWidth) + num(acs.borderBottomWidth) : 0;
    const maxD = find(own, ["max-height", "max-block-size"]), minD = find(own, ["min-height", "min-block-size"]), sizeD = find(own, ["height", "block-size"]);
    if (acs.maxHeight !== "none" && Math.abs(num(acs.maxHeight) + pad - ar.height) <= 1) return maxD ? say(maxD) : [{ p: "max-height" }, ": ", { v: acs.maxHeight }];
    if (acs.minHeight !== "auto" && num(acs.minHeight) > 0 && Math.abs(num(acs.minHeight) + pad - ar.height) <= 1) return minD ? say(minD) : [{ p: "min-height" }, ": ", { v: acs.minHeight }];
    if (sizeD && !/^(auto|fit-content|max-content|min-content)$/.test(sizeD.value)) return /%$/.test(sizeD.value) && parent ? [...say(sizeD), " of ", E(parent)] : say(sizeD);
    if (a === document.documentElement && Math.abs(ar.height - innerHeight) <= 1) return ["the viewport"];
    const ratio = find(own, ["aspect-ratio"]);
    if (ratio && acs.aspectRatio !== "auto") return [...say(ratio), ", from its width"];
    if (/^(img|video|canvas|svg|iframe|embed|object)$/.test(a.localName)) {
      const w = a.naturalWidth || a.videoWidth, h = a.naturalHeight || a.videoHeight;
      return h ? ["its intrinsic ratio (", { v: `${w} × ${h}` }, "), from its width"] : ["its intrinsic size"];
    }
    if (/absolute|fixed/.test(acs.position) && acs.top !== "auto" && acs.bottom !== "auto") return ["both insets"];
    if (parent) {
      const pcs = getComputedStyle(parent), pr = parent.getBoundingClientRect();
      const inner = pr.height - num(pcs.paddingTop) - num(pcs.paddingBottom) - num(pcs.borderTopWidth) - num(pcs.borderBottomWidth);
      const outer = ar.height + Math.max(num(acs.marginTop), 0) + Math.max(num(acs.marginBottom), 0);
      const stretch = acs.alignSelf === "stretch" || acs.alignSelf === "auto" && /normal|stretch/.test(pcs.alignItems);
      if (/flex/.test(pcs.display) && !/column/.test(pcs.flexDirection) && stretch && Math.abs(inner - outer) <= 1) return ["stretches to ", E(parent), "'s row"];
      if (/flex/.test(pcs.display) && /column/.test(pcs.flexDirection) && num(acs.flexGrow) > 0 && Math.abs(inner - outer) > 1) return ["grows in ", E(parent), "'s column"];
      if (/grid/.test(pcs.display) && stretch && Math.abs(inner - outer) <= 1) return ["stretches to ", E(parent), "'s grid"];
    }
    return ["its content"];
  }
  function sizeLadder(store, el) {
    const out = [];
    if (!el.getBoundingClientRect().width) return out;
    for (let a = el; a; a = a.parentElement) {
      const r = a.getBoundingClientRect();
      out.push({ el: a, name: name(a), w: r.width, h: r.height, width: widthWhy(store, a), height: heightWhy(store, a) });
      if (a === document.body) break;
    }
    return out;
  }
  function explainSize(store, el, wantW, cap) {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el), parent = el.parentElement, pcs = parent ? getComputedStyle(parent) : null;
    const axes = Math.abs(wantW - r.width) > 1 ? [{ axis: "x", want: wantW, got: r.width }] : [];
    if (!axes.length) return null;
    const rendered2 = (x) => store.matchModel(x, [el]).length > 0;
    const own = store.models.filter((m) => !m.inlineEl && m.decls.some((d) => d.type === "decl" && d.on) && rendered2(m));
    const above = parent ? store.models.filter((m) => !m.inlineEl && m.decls.some((d) => d.type === "decl" && d.on) && store.matchModel(m, [parent]).length > 0) : [];
    const find2 = (models, props) => {
      for (const m of [...models].reverse()) for (const d of [...m.decls].reverse()) if (d.type === "decl" && d.on && d.live && props.includes(d.prop)) return d;
      return null;
    };
    const flex = /flex/.test(pcs?.display || ""), grid = /grid/.test(pcs?.display || ""), row = !/column/.test(pcs?.flexDirection || "");
    const held = (d, text, area = null) => ({ d, text, area });
    for (const { axis, want, got } of axes) {
      const x = axis === "x";
      const maxP = x ? ["max-width", "max-inline-size"] : ["max-height", "max-block-size"], minP = x ? ["min-width", "min-inline-size"] : ["min-height", "min-block-size"];
      const maxC = x ? cs.maxWidth : cs.maxHeight, minC = x ? cs.minWidth : cs.minHeight;
      const pad = cs.boxSizing === "content-box" ? x ? num(cs.paddingLeft) + num(cs.paddingRight) + num(cs.borderLeftWidth) + num(cs.borderRightWidth) : num(cs.paddingTop) + num(cs.paddingBottom) + num(cs.borderTopWidth) + num(cs.borderBottomWidth) : 0;
      if (maxC !== "none" && got < want && Math.abs(num(maxC) + pad - got) <= 1) {
        const d2 = find2(own, maxP);
        return held(d2, `held by ${d2 ? `${d2.prop}: ${d2.value}` : `${maxP[0]}: ${maxC}`}`);
      }
      if (minC !== "auto" && num(minC) > 0 && got > want && Math.abs(num(minC) + pad - got) <= 1) {
        const d2 = find2(own, minP);
        return held(d2, `held by ${d2 ? `${d2.prop}: ${d2.value}` : `${minP[0]}: ${minC}`}`);
      }
      if (cap === "content") {
        const child = [...el.children].filter((c) => !helper(c)).sort((a, b) => {
          const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
          return x ? rb.right - ra.right : rb.bottom - ra.bottom;
        })[0];
        const d2 = child ? store.models.find((m) => m.inlineEl === child)?.decls.find((k) => k.type === "decl" && k.on && k.prop === (x ? "inline-size" : "block-size")) || null : null;
        return held(d2, `held by content${child ? `: ${name(child)}` : ""}`, child || null);
      }
      if (cap) {
        const d2 = cap === "grid" ? find2(above, x ? ["grid-template-columns", "grid-auto-columns", "grid-template", "grid"] : ["grid-template-rows", "grid-auto-rows", "grid-template", "grid"]) : find2(above, x ? ["width", "inline-size", "max-width", "max-inline-size"] : ["height", "block-size", "max-height", "max-block-size"]);
        if (cap === "grid") return held(d2, `grid track${d2 ? `: ${d2.value}` : ""}`, parent);
        if (d2) return held(d2, `${name(parent)}: ${d2.prop}: ${d2.value}`, parent);
        const gp = parent?.parentElement, gcs = gp ? getComputedStyle(gp) : null;
        if (gcs && /grid/.test(gcs.display)) {
          const g = declaredOn(store, gp, ["place-items", "justify-items"]) || declaredOn(store, parent, ["justify-self", "place-self"]) || declaredOn(store, gp, ["display"]);
          return held(g, `${name(gp)} grid${g ? `: ${g.prop}: ${g.value}` : ""}`, parent);
        }
        if (gcs && /flex/.test(gcs.display)) {
          const g = declaredOn(store, parent, ["flex", "flex-grow"]) || declaredOn(store, gp, ["display"]);
          return held(g, `${name(gp)} flex${g ? `: ${g.prop}: ${g.value}` : ""}`, parent);
        }
        return held(null, `${name(parent)}: content-sized`, parent);
      }
      const max = x ? ["max-width", "max-inline-size"] : ["max-height", "max-block-size"], min = x ? ["min-width", "min-inline-size"] : ["min-height", "min-block-size"];
      const size = x ? ["width", "inline-size"] : ["height", "block-size"];
      const maxV = x ? cs.maxWidth : cs.maxHeight, minV = x ? cs.minWidth : cs.minHeight;
      let d = null, note = "";
      if (maxV !== "none" && got < want && Math.abs(num(maxV) + (cs.boxSizing === "content-box" ? x ? num(cs.paddingLeft) + num(cs.paddingRight) + num(cs.borderLeftWidth) + num(cs.borderRightWidth) : num(cs.paddingTop) + num(cs.paddingBottom) + num(cs.borderTopWidth) + num(cs.borderBottomWidth) : 0) - got) <= 1) {
        d = find2(own, max);
        note = d ? `${d.prop}: ${d.value}` : `${max[0]}: ${maxV}`;
      } else if (minV !== "auto" && num(minV) > 0 && got > want) {
        d = find2(own, min);
        note = d ? `${d.prop}: ${d.value}` : `${min[0]}: ${minV}`;
      } else if ((d = find2(own, size)) && d.important) note = `${d.prop}: ${d.value} !important`;
      else if (cs.display === "inline") {
        d = find2(own, ["display"]);
        note = "display: inline";
      } else if (flex && row === x) {
        const grow = num(cs.flexGrow), shrink = num(cs.flexShrink);
        d = find2(own, got < want ? ["flex-shrink", "flex"] : ["flex-grow", "flex"]);
        note = d ? `${d.prop}: ${d.value}` : got < want && shrink ? `flex-shrink: ${shrink}` : got > want && grow ? `flex-grow: ${grow}` : "the flex container";
        if (!d) d = find2(above, ["display"]);
      } else if (grid) {
        d = find2(above, x ? ["grid-template-columns", "grid-auto-columns"] : ["grid-template-rows", "grid-auto-rows"]);
        note = d ? `${d.prop}: ${d.value}` : "the grid track";
      } else if (/absolute|fixed/.test(cs.position) && (x ? cs.left !== "auto" && cs.right !== "auto" : cs.top !== "auto" && cs.bottom !== "auto")) {
        d = find2(own, x ? ["left", "right", "inset", "inset-inline"] : ["top", "bottom", "inset", "inset-block"]);
        note = d ? `${d.prop}: ${d.value}` : "both insets";
      } else {
        d = null;
        note = "";
      }
      if (note) return held(d, `held by ${note}`);
    }
    return null;
  }

  // src/overlay/painter.js
  var Painter = class {
    constructor(ov) {
      this.ov = ov;
      this.into = null;
      this.placed = [];
      this.pending = [];
      this.rectCache = null;
      this.geometryCache = null;
    }
    begin() {
      this.rectCache = /* @__PURE__ */ new Map();
      this.geometryCache = /* @__PURE__ */ new Map();
      this.ov.replaceChildren();
      this.placed = [];
      this.pending = [];
    }
    end() {
      this.resolve();
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
      this.pending.push({ kind: "chip", label, r, chrome });
    }
    fix(label) {
      this.pending.push({ kind: "fix", label });
      return label;
    }
    place(label, side, from, to, chrome) {
      this.pending.push({ kind: "place", label, side, from, to, chrome });
    }
    beside(r, chrome) {
      if (innerWidth - r.right < 90) return false;
      return !chrome.some((c) => r.right + 10 < c.right && r.right + 90 > c.left && r.top < c.bottom && r.bottom > c.top);
    }
    resolve() {
      const sizes = /* @__PURE__ */ new Map();
      for (const { label } of this.pending) {
        if (sizes.has(label)) continue;
        const b = label.getBoundingClientRect(), t = getComputedStyle(label).transform.match(/matrix\(([^)]*)\)/);
        const [, , , , tx, ty] = t ? t[1].split(",").map(Number) : [1, 0, 0, 1, 0, 0];
        sizes.set(label, { w: b.width, h: b.height, tx, ty });
      }
      const hits = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      const rectOf = (label) => {
        const s = sizes.get(label), l = num(label.style.left) + s.tx, t = num(label.style.top) + s.ty;
        return { left: l, top: t, right: l + s.w, bottom: t + s.h, width: s.w, height: s.h };
      };
      const clamp = (label) => {
        const b = rectOf(label);
        let dx = 0, dy = 0;
        if (b.left < 4) dx = 4 - b.left;
        else if (b.right > innerWidth - 4) dx = innerWidth - 4 - b.right;
        if (b.top < 4) dy = 4 - b.top;
        else if (b.bottom > innerHeight - 4) dy = innerHeight - 4 - b.bottom;
        if (dx) label.style.left = `${num(label.style.left) + dx}px`;
        if (dy) label.style.top = `${num(label.style.top) + dy}px`;
      };
      const free = (label, chrome) => {
        const b = rectOf(label);
        return !chrome.some((c) => hits(b, c)) && !this.placed.some((p) => hits(b, p));
      };
      for (const item of this.pending) {
        const { label } = item;
        if (!label.isConnected) continue;
        if (item.kind === "fix") {
          clamp(label);
          this.placed.push(rectOf(label));
          continue;
        }
        if (item.kind === "chip") {
          const { r, chrome: chrome2 } = item, { w: w2, h: h2 } = sizes.get(label);
          const spots = [];
          if (r.top - h2 - 8 >= 0) spots.push([r.left, r.top - h2 - 8]);
          if (r.bottom + h2 + 8 <= innerHeight) spots.push([r.left, r.bottom + 8]);
          spots.push([r.left + 8, r.top + 8], [r.right + 8, r.top], [r.left - w2 - 8, r.top]);
          let found = false;
          for (const [x, y] of spots) {
            label.style.left = `${Math.max(x, 0)}px`;
            label.style.top = `${y}px`;
            clamp(label);
            if (free(label, chrome2)) {
              this.placed.push(rectOf(label));
              found = true;
              break;
            }
          }
          if (!found) label.remove();
          continue;
        }
        const { side, from, to, chrome } = item, { w, h } = sizes.get(label);
        const set = (mid2) => {
          label.style[side] = `${mid2}px`;
        };
        const mid = (from + to) / 2;
        set(mid);
        if (!free(label, chrome)) {
          const size = side === "left" ? w : h, step = size * 0.6 + 4;
          const span2 = Math.max((to - from) / 2 - size / 2, 0);
          let found = false;
          for (let k = 1; k * step <= span2 && !found; k++) {
            for (const dir of [1, -1]) {
              set(mid + dir * k * step);
              if (free(label, chrome)) {
                found = true;
                break;
              }
            }
          }
          if (!found) {
            set(mid);
            const cross = side === "left" ? "top" : "left", thick = (side === "left" ? h : w) + 4;
            const base = num(label.style[cross]);
            for (let k = 1; k <= 4 && !found; k++) {
              for (const dir of [-1, 1]) {
                label.style[cross] = `${base + dir * k * thick}px`;
                if (free(label, chrome)) {
                  found = true;
                  break;
                }
              }
            }
            if (!found) label.style[cross] = `${base}px`;
          }
        }
        clamp(label);
        this.placed.push(rectOf(label));
      }
      this.pending = [];
    }
  };

  // src/overlay/draw.js
  function bands(painter, el, values = true) {
    const { r, p, m, b } = painter.geometry(el);
    const all = { t: 1, r: 1, b: 1, l: 1 };
    const pos = { t: Math.max(m.t, 0), r: Math.max(m.r, 0), b: Math.max(m.b, 0), l: Math.max(m.l, 0) };
    if (pos.t || pos.r || pos.b || pos.l) painter.ring("mr", painter.outer(r, pos), pos, all, values && "mv");
    if (b.t || b.r || b.b || b.l) painter.ring("bd", r, b, all, values && "bv");
    const inner = { left: r.left + b.l, top: r.top + b.t, right: r.right - b.r, bottom: r.bottom - b.b, width: r.width - b.l - b.r, height: r.height - b.t - b.b };
    if (p.t || p.r || p.b || p.l) painter.ring("pd", inner, p, all, values && "pv");
  }
  function paintModel(painter, el, hue, chrome, focus) {
    const r = painter.geometry(el).r;
    if (el === focus) {
      painter.box("gd v", r.left, 0, 0, innerHeight);
      painter.box("gd v", r.right, 0, 0, innerHeight);
      painter.box("gd h", 0, r.top, innerWidth, 0);
      painter.box("gd h", 0, r.bottom, innerWidth, 0);
    }
    bands(painter, el);
    painter.box("box", r.left, r.top, r.width, r.height);
    painter.chip(painter.label("hue", painter.chipParts(el, r, false), 0, 0), r, chrome);
    painter.dims(r, chrome);
  }
  function paintProbe(painter, el, chrome, withBands = false) {
    const r = painter.geometry(el).r;
    if (withBands) bands(painter, el);
    painter.box("box", r.left, r.top, r.width, r.height);
    painter.chip(painter.label("", painter.chipParts(el, r, false), 0, 0), r, chrome);
    painter.dims(r, chrome);
  }
  function paintMeasure(painter, el, chrome) {
    const { r, m } = painter.geometry(el);
    bands(painter, el);
    painter.box("box", r.left, r.top, r.width, r.height);
    painter.chip(painter.label("", painter.chipParts(el, r, true), 0, 0), r, chrome);
    paintFree(painter, el, r, m);
  }
  function paintFree(painter, el, r, m) {
    const parent = el.parentElement, cs = painter.geometry(el).cs;
    if (!parent || helper(parent)) return;
    const pcs = getComputedStyle(parent);
    if (!/^(block|flow-root|list-item)$/.test(pcs.display) || !/^(block|flex|grid|table|list-item|flow-root)$/.test(cs.display) || cs.float !== "none" || /absolute|fixed/.test(cs.position)) return;
    const { r: pr, p: pp, b: pb } = painter.geometry(parent);
    const inner = { left: pr.left + pb.l + pp.l, right: pr.right - pb.r - pp.r };
    const top = r.top - Math.max(m.t, 0), height = r.height + Math.max(m.t, 0) + Math.max(m.b, 0);
    for (const [l, w] of [[inner.left, r.left - Math.max(m.l, 0) - inner.left], [r.right + Math.max(m.r, 0), inner.right - r.right - Math.max(m.r, 0)]]) {
      if (w < 24 || height < 8) continue;
      painter.box("free", l, top, w, height);
      if (w >= 72) painter.label("fv", `unused ${fmt(w)}px`, l + w / 2, top + height / 2);
    }
  }
  function paintDistance(painter, from, to, chrome) {
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    painter.box("dbox", b.left, b.top, b.width, b.height);
    let line = null, gap = 0, chipX, chipY;
    const mid = (lo1, hi1, lo2, hi2) => {
      const lo = Math.max(lo1, lo2), hi = Math.min(hi1, hi2);
      return lo < hi ? (lo + hi) / 2 : (lo1 + hi1) / 2;
    };
    if (b.left >= a.right) {
      gap = b.left - a.right;
      const y = mid(a.top, a.bottom, b.top, b.bottom);
      line = painter.box("dln", a.right, y, gap, 1);
      chipX = a.right + gap / 2;
      chipY = y;
    } else if (b.right <= a.left) {
      gap = a.left - b.right;
      const y = mid(a.top, a.bottom, b.top, b.bottom);
      line = painter.box("dln", b.right, y, gap, 1);
      chipX = b.right + gap / 2;
      chipY = y;
    } else if (b.top >= a.bottom) {
      gap = b.top - a.bottom;
      const x = mid(a.left, a.right, b.left, b.right);
      line = painter.box("dln", x, a.bottom, 1, gap);
      chipX = x;
      chipY = a.bottom + gap / 2;
    } else if (b.bottom <= a.top) {
      gap = a.top - b.bottom;
      const x = mid(a.left, a.right, b.left, b.right);
      line = painter.box("dln", x, b.bottom, 1, gap);
      chipX = x;
      chipY = b.bottom + gap / 2;
    }
    if (line) painter.label("dch", fmt(gap), chipX, chipY);
    painter.chip(painter.label("", painter.chipParts(to, b), 0, 0), b, chrome);
  }
  function paintDecl(painter, el, d, chrome) {
    const { r, cs, p, m, b } = painter.geometry(el);
    const band = sides(d.prop, cs);
    if (band && band.kind === "padding") {
      painter.ring("pd", { left: r.left + b.l, top: r.top + b.t, right: r.right - b.r, bottom: r.bottom - b.b, width: r.width - b.l - b.r, height: r.height - b.t - b.b }, p, band.sides, "pv");
    } else if (band) {
      const pos = { t: Math.max(m.t, 0), r: Math.max(m.r, 0), b: Math.max(m.b, 0), l: Math.max(m.l, 0) };
      painter.ring("mr", painter.outer(r, pos), pos, band.sides, "mv");
    }
    painter.box("box", r.left, r.top, r.width, r.height);
    if (!band && SIZE.test(d.prop)) sizeLine(painter, el, d, r, cs, p, b, chrome);
  }
  function sizeLine(painter, el, d, r, cs, p, b, chrome) {
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
      painter.box("ln dim-width", r.left + pad, y, len, 1);
      const l = painter.label("sz", text, 0, y + (above ? -12 : 12));
      painter.place(l, "left", r.left + pad, r.left + pad + len, chrome);
    } else {
      const beside = painter.beside(r, chrome);
      const x = beside ? r.right + 10 : r.right - 10;
      painter.box("ln dim-height", x, r.top + pad, 1, len);
      const l = painter.label("sz", text, x + (beside ? 8 : -8), 0);
      l.style.transform = beside ? "translate(0, -50%)" : "translate(-100%, -50%)";
      painter.place(l, "top", r.top + pad, r.top + pad + len, chrome);
    }
  }

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
      const candidates2 = byHead.get(wanted) || [];
      let low = 0, high = candidates2.length;
      while (low < high) {
        const mid = low + high >>> 1;
        if (candidates2[mid] < cursor) low = mid + 1;
        else high = mid;
      }
      const k = candidates2[low];
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
      const rule = meta.inlineEl ? { style: owner.style, selectorText: "element.style" } : owner;
      let decls = sourceDecls || [], accepted = false;
      if (decls.length) {
        const text = decls.filter((d) => d.type === "decl").map((d) => `${d.prop}: ${d.value}${d.important ? " !important" : ""};`).join("\n");
        try {
          accepted = this.scratch({ head }, text).cssText === rule.style.cssText;
        } catch {
          accepted = false;
        }
      }
      if (model && !this.dirtyModels.has(model) && !this.ui.keep(model) && accepted) model = null;
      if (!model) {
        model = { rule, head, ...meta, baseline: rule.style.cssText, originalAttribute: meta.inlineEl?.getAttribute("style") ?? null };
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
      const pending = new Map(this.styleChanges(this.scratch(model, model.lastApplied), this.scratch(model, live)).map((change) => [change.prop, change]));
      for (const entry of parseDecls(live, 0, live.length)) {
        if (entry.type !== "decl") continue;
        const covers = [...this.scratch(model, `${entry.prop}: ${entry.value}`)];
        if (covers.length < 2 || !covers.every((prop) => pending.has(prop))) continue;
        this.writeProperty(baseline, entry.prop, entry.value, entry.important ? "important" : "");
        for (const prop of covers) pending.delete(prop);
      }
      for (const { prop, value, priority } of pending.values()) this.writeProperty(baseline, prop, value, priority);
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
      const norm2 = (d) => this.normValue(model, d);
      model.decls = parseDecls(live, 0, live.length).map((entry) => {
        if (entry.type !== "decl") return entry;
        const same = old.filter((candidate) => candidate.prop === entry.prop && candidate.on && !used.has(candidate));
        const winner = same.length > 1 ? same.find((candidate) => norm2(candidate) === norm2(entry)) || [...same].reverse().find((candidate) => !!candidate.important === !!entry.important) || same.at(-1) : same[0];
        const d = winner || { model, rule: model.rule };
        used.add(d);
        const orig = d.orig != null && norm2(d) === norm2(entry) ? d.orig : baseline.getPropertyValue(entry.prop);
        Object.assign(d, entry, { orig, live: true, on: true });
        return d;
      });
      for (const d of old) if (!used.has(d)) {
        if (this.ui.held(d) || !d.on) {
          d.on = false;
          if (!old.some((x) => x !== d && x.prop === d.prop)) d.orig = baseline.getPropertyValue(d.prop) || d.orig;
          model.decls.push(d);
        } else if (model.decls.some((x) => x.type === "decl" && x.prop === d.prop)) {
          const next = model.decls.findIndex((x) => x.type === "decl" && x.prop === d.prop && old.indexOf(x) > old.indexOf(d));
          const at = next >= 0 ? next : model.decls.length - 1 - [...model.decls].reverse().findIndex((x) => x.type === "decl" && x.prop === d.prop) + 1;
          model.decls.splice(at, 0, d);
        } else this.ui.dropped(d);
      }
      this.settleChains(model);
      model.nativeFallback = true;
      model.sourceText = live;
      model.lastApplied = live;
    }
    normValue(model, d) {
      const s = this.scratch(model, `${d.prop}: ${d.value}${d.important ? " !important" : ""}`);
      return `${s.getPropertyValue(d.prop)}${s.getPropertyPriority(d.prop) ? " !important" : ""}`;
    }
    settleChains(model) {
      const live = model.rule.style, effective = this.scratch(model, this.declarationText(model));
      for (const prop of new Set(model.decls.filter((d) => d.type === "decl" && d.on).map((d) => d.prop))) {
        if (effective.getPropertyValue(prop) === live.getPropertyValue(prop) && effective.getPropertyPriority(prop) === live.getPropertyPriority(prop)) continue;
        const lines = model.decls.filter((d) => d.type === "decl" && d.on && d.prop === prop);
        const liveValue = `${live.getPropertyValue(prop)}${live.getPropertyPriority(prop) ? " !important" : ""}`;
        const winner = lines.find((d) => this.normValue(model, d) === liveValue) || null;
        for (const d of lines) if (d !== winner) d.on = false;
      }
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
    constructor({ pickTarget, isHelper, editing, cancelEdit, say: say2, onSwitch, busy = () => false }) {
      this.busy = busy;
      this.pickTarget = pickTarget;
      this.onSwitch = onSwitch;
      this.isHelper = isHelper;
      this.editing = editing;
      this.cancelEdit = cancelEdit;
      this.say = say2;
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
      this.onSwitch?.(id);
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
        if (event.type === "contextmenu") {
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }
        if (this.busy()) return;
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

  // src/tools/resize.js
  var Resizer = class {
    constructor(ui) {
      this.ui = ui;
      const { els } = ui;
      this.sizing = false;
      this.target = null;
      this.sized = /* @__PURE__ */ new Map();
      this.wrote = /* @__PURE__ */ new WeakMap();
      this.drag = null;
      this.cap = { x: null, y: null };
      this.hugs = /* @__PURE__ */ new Set();
      this.blocked = null;
      this.heldArea = null;
      this.first = /* @__PURE__ */ new WeakMap();
      this.history = new History(() => {
      });
      this.handleEvents(els.handle);
      ui.tools.register("sizing", {
        label: "Click an element to resize · Esc to end",
        handlers: () => ({
          click: (target) => this.choose(target),
          escape: () => {
            this.setSizing(false);
            els.btn.focus();
          }
        }),
        release: () => this.cancel()
        // a running drag ends when the tool changes hands or closes
      });
    }
    setSizing(on) {
      if (on === this.sizing) return;
      if (!on) this.cancel();
      this.sizing = on;
      this.ui.els.btn.setAttribute("aria-pressed", String(on));
      this.ui.host.toggleAttribute("sizing", on);
      if (on) this.ui.tools.arm("sizing");
      else {
        this.target = null;
        this.setBlocked(null, "");
        this.ui.els.handle.removeAttribute("data-on");
        this.ui.els.hreset.removeAttribute("data-on");
        this.ui.els.wval.textContent = "";
        this.ui.els.wnow.replaceChildren();
        this.ui.tools.end("sizing");
      }
      if (!on) this.ui.box(false);
      this.ui.paint();
    }
    prune() {
      for (const el of this.sized.keys()) if (!el.isConnected || helper(el)) this.sized.delete(el);
      if (this.target && (!this.target.isConnected || helper(this.target))) {
        this.cancel();
        this.target = null;
        this.ui.els.handle.removeAttribute("data-on");
        this.ui.els.hreset.removeAttribute("data-on");
        this.ui.els.wval.textContent = "";
        this.ui.els.wnow.replaceChildren();
      }
    }
    writeSize(el, px, snap = true) {
      const base = parentBase(this.ui.store, el), prop = sizeProp(el), parent = el.parentElement;
      if (base > 0 && !snap) px = Math.min(px, Math.round(base));
      el.style.setProperty(prop, `${Math.max(1, px)}px`, el.style.getPropertyPriority(prop));
      if (base > 0 && snap && px >= base - 0.5 && !this.hugs.has(parent)) {
        if (Math.abs(contentWidth(parent) - base) > 0.5) this.hugs.add(parent);
        else {
          const extra = extraOf(getComputedStyle(el));
          el.style.setProperty(prop, extra ? `calc(100% - ${fmt(extra)}px)` : "100%", el.style.getPropertyPriority(prop));
        }
      }
      this.wrote.set(el, { attr: el.getAttribute("style"), prop, written: true });
      return base > 0 && px > base + 0.5 && !this.hugs.has(parent);
    }
    restoreSize(el, attr, prop = sizeProp(el)) {
      if (!el.isConnected) return;
      const want = sizeOf(el, attr, prop);
      this.ui.store.writeProperty(el.style, want.prop, want.value, want.priority);
      if (el.style.cssText === want.cssText) {
        if (attr == null) el.removeAttribute("style");
        else el.setAttribute("style", attr);
      }
      this.wrote.set(el, { attr: el.getAttribute("style"), prop, written: true });
    }
    pageSized(el) {
      const ours = this.wrote.get(el);
      if (!ours) return false;
      const now = sizeOf(el, el.getAttribute("style"), ours.prop), expected = sizeOf(el, ours.attr, ours.prop);
      return now.value !== expected.value || now.priority !== expected.priority;
    }
    cancel() {
      if (this.drag) this.ui.cancelGesture();
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
        this.writeSize(kid, Math.max(1, Math.round(room - extraOf(kcs))));
      }
    }
    explain(el, want) {
      const held = explainSize(this.ui.store, el, want, this.cap?.x);
      if (held) this.setBlocked(held.d, held.text, held.area);
      else this.setBlocked(null, "");
    }
    setBlocked(d, text, area = null) {
      const was = this.blocked;
      this.blocked = d;
      this.heldArea = text ? area : null;
      const { wblock } = this.ui.els;
      wblock.replaceChildren();
      if (!text) {
        if (was) this.ui.syncRow(was);
        return;
      }
      if (d) {
        const shown = `${d.prop}: ${d.value}${d.important ? " !important" : ""}`;
        const note = (text.includes(shown) ? text.replace(shown, "") : text.includes(`${d.prop}: ${d.value}`) ? text.replace(`${d.prop}: ${d.value}`, "") : text.replace(`: ${d.value}`, ":")).trim();
        const label = document.createElement("label");
        label.className = "hdecl";
        const box = document.createElement("input");
        box.type = "checkbox";
        box.checked = d.on;
        box.setAttribute("aria-label", `${d.prop}: ${d.value}`);
        box.addEventListener("change", () => {
          this.ui.toggleDecl(d, box.checked);
          label.classList.toggle("off", !d.on);
        });
        label.append(box, span("t", `${d.prop}: `), span("v", d.value), ...d.important ? [" ", span("x", "!important")] : []);
        label.classList.toggle("off", !d.on);
        wblock.append(span("hnote", note ? `${note} ` : ""), label);
      } else wblock.append(span("hnote", text));
      if (this.target) {
        const go = document.createElement("button");
        go.type = "button";
        go.className = "wgo";
        go.textContent = "Go to this element";
        go.addEventListener("click", () => this.ui.goTo(this.target, d));
        wblock.append(go);
      }
      if (was) this.ui.syncRow(was);
      if (d) {
        this.ui.syncRow(d);
        this.ui.revealRow(d);
      }
    }
    blockedText() {
      const w = this.ui.els.wblock;
      return w.childNodes.length ? [...w.childNodes].filter((n) => !n.classList?.contains("wgo")).map((n) => n.textContent).join("").trim() : "";
    }
    // the reason alone, without the door's words
    choose(el) {
      this.setBlocked(null, "");
      this.target = el;
      if (!this.first.has(el)) {
        const r = el.getBoundingClientRect();
        this.first.set(el, { w: r.width, h: r.height });
      }
      this.ui.els.handle.setAttribute("data-on", "");
      this.ui.box(true);
      this.ui.paint();
    }
    handleEvents(handle) {
      handle.addEventListener("pointerdown", (e) => {
        const el = this.target;
        if (e.button !== 0 || !el || !resizeSupported(el)) return;
        e.preventDefault();
        e.stopPropagation();
        this.ui.finishEdit();
        const from = { x: e.clientX, w: el.getBoundingClientRect().width };
        const session = this.start(el);
        let want = from.w;
        this.ui.gesture(e, (event) => {
          want = Math.max(1, from.w + event.clientX - from.x);
          this.width(session, want);
          if (!this.drag) return;
          const held = this.cap.x || Math.abs(el.getBoundingClientRect().width - want) > 1, now = performance.now();
          if (held && (!this.blockedText() || now - (this.explainedAt || 0) > 200)) {
            this.explainedAt = now;
            this.explain(el, want);
          } else if (!held && this.blockedText()) this.setBlocked(null, "");
        }, (_, cancelled) => {
          this.finish(session, cancelled);
          this.ui.suppressClick();
          if (!cancelled && el.isConnected) this.explain(el, want);
        });
      });
      handle.addEventListener("keydown", (e) => {
        const el = this.target;
        if (!["ArrowLeft", "ArrowRight"].includes(e.key) || !el || !resizeSupported(el)) return;
        e.preventDefault();
        e.stopPropagation();
        const session = this.start(el);
        const want = Math.max(1, el.getBoundingClientRect().width + (e.key === "ArrowRight" ? 1 : -1) * (e.shiftKey ? 10 : 1));
        this.width(session, want);
        this.finish(session, false);
        this.explain(el, want);
      });
    }
    start(el) {
      if (!this.sized.has(el)) this.sized.set(el, el.getAttribute("style"));
      const cs = getComputedStyle(el);
      const kids = [...this.sized.keys()].filter((kid) => kid !== el && el.contains(kid) && kid.isConnected);
      const before = new Map([el, ...kids].map((node) => [node, node.getAttribute("style")]));
      for (const [node, attr] of before) {
        if (this.pageSized(node)) this.sized.set(node, attr);
        this.wrote.set(node, { attr, prop: sizeProp(node), written: false });
      }
      this.cap = { x: null, y: null };
      this.hugs = /* @__PURE__ */ new Set();
      this.drag = el;
      this.ui.host.setAttribute("resizing", "");
      return { el, kids, before, extra: extraOf(cs), limit: sizeLimits(this.ui.store, el, cs) };
    }
    width(session, desired) {
      const { el, kids, before, extra, limit } = session;
      if (!el.isConnected || helper(el)) {
        this.cancel();
        return;
      }
      if (!resizeSupported(el)) {
        this.cancel();
        this.setBlocked(null, "transformed: edit the CSS value instead");
        return;
      }
      for (const node of [el, ...kids]) if (this.pageSized(node)) {
        const attr = node.getAttribute("style");
        before.set(node, attr);
        this.sized.set(node, attr);
      }
      let w = Math.max(1, desired);
      this.cap = { x: null, y: null };
      if (w > limit.w) {
        w = limit.w;
        this.cap.x = limit.whyW;
      }
      const chain = [];
      for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) chain.push({ a, was: contentWidth(a) });
      if (this.writeSize(el, Math.round(w - extra))) this.cap.x ||= "parent";
      let bound = chain.at(-1)?.a || null;
      for (const { a, was } of chain) {
        if (Math.abs(contentWidth(a) - was) > 0.5) this.hugs.add(a);
        else {
          bound = a;
          break;
        }
      }
      const over = limit.parent && bound ? overflow(el, bound) : null;
      if (over?.x > 0.5) {
        this.writeSize(el, Math.max(1, Math.round(w - over.x - extra)));
        this.cap.x ||= "parent";
      }
      for (let pass = 0; ; pass++) {
        for (const kid of kids) this.restoreSize(kid, before.get(kid));
        this.crush(el, kids);
        const need = contentNeed(el);
        if (need.x <= 1 || pass === 4) break;
        this.writeSize(el, Math.round(el.getBoundingClientRect().width + need.x - extra), false);
        this.cap.x = "content";
      }
      this.ui.paint();
    }
    finish(session, cancelled) {
      if (cancelled) for (const [node, attr] of session.before) {
        if (this.wrote.get(node)?.written && !this.pageSized(node)) this.restoreSize(node, attr, this.wrote.get(node)?.prop);
      }
      else {
        const steps = [...session.before].filter(([node, attr]) => this.wrote.get(node)?.written && node.isConnected && node.getAttribute("style") !== attr).map(([node, attr]) => ({ el: node, before: attr, after: this.wrote.get(node)?.attr ?? node.getAttribute("style"), prop: this.wrote.get(node)?.prop }));
        if (steps.length) this.history.push(steps);
      }
      this.drag = null;
      this.ui.host.removeAttribute("resizing");
      this.changed();
    }
    changed() {
      this.ui.dirtyHtml();
      this.ui.queueLoad();
      this.ui.paint();
    }
    reset(el, record = true) {
      this.cancel();
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
        if (record && el.getAttribute("style") !== before) this.history.push([{ el, before, after: el.getAttribute("style"), prop }]);
      }
      this.changed();
    }
    undo() {
      this.cancel();
      const entry = this.history.pop();
      if (!entry) return;
      this.setBlocked(null, "");
      let skipped = 0;
      for (const step of [...entry].reverse()) {
        if (!step.el.isConnected || helper(step.el)) {
          skipped++;
          continue;
        }
        const now = sizeOf(step.el, step.el.getAttribute("style"), step.prop), expected = sizeOf(step.el, step.after, step.prop);
        if (now.value !== expected.value || now.priority !== expected.priority) {
          skipped++;
          continue;
        }
        if (!this.sized.has(step.el)) this.sized.set(step.el, step.after);
        this.restoreSize(step.el, step.before, step.prop);
        if (step.el.getAttribute("style") === this.sized.get(step.el)) this.sized.delete(step.el);
      }
      if (skipped) this.setBlocked(null, `${skipped} resize${skipped === 1 ? "" : "s"} skipped: the page changed it`);
      this.changed();
    }
    resetAll() {
      this.cancel();
      let skipped = 0;
      for (const [el, attr] of this.sized) {
        if (this.pageSized(el)) skipped++;
        else this.restoreSize(el, attr, this.wrote.get(el)?.prop);
      }
      this.sized.clear();
      this.history.clear();
      if (skipped) this.setBlocked(null, `${skipped} resize${skipped === 1 ? "" : "s"} skipped: the page changed it`);
      this.changed();
    }
    paintHold(el, chrome) {
      const { painter } = this.ui, { r } = painter.geometry(el);
      painter.box("dbox", r.left, r.top, r.width, r.height);
      painter.chip(painter.label("hold", this.blockedText(), 0, 0), r, chrome);
    }
    paintSizer(el, chrome = []) {
      const { painter, els } = this.ui, { r } = painter.geometry(el);
      painter.box("box", r.left, r.top, r.width, r.height);
      const first = this.first.get(el) || { w: r.width, h: r.height }, dw = r.width - first.w, dh = r.height - first.h;
      els.wval.textContent = `${name(el)} ${fmt(first.w)} × ${fmt(first.h)}px`;
      const sign = (d) => Math.abs(d) < 0.01 ? "0" : (d > 0 ? "+" : "−") + fmt(Math.abs(d));
      const diff = document.createElement("span");
      diff.className = "wdiff";
      diff.textContent = `${sign(dw)} × ${sign(dh)}px`;
      els.wnow.replaceChildren(`${fmt(r.width)} × ${fmt(r.height)}px`, diff);
      if (Math.abs(dw) >= 0.01 || Math.abs(dh) >= 0.01) {
        const above = r.top >= 32, y = above ? r.top - 10 : r.top + 10;
        painter.box("ln dim-width", r.left, y, r.width, 1);
        painter.place(painter.label("sz", `${fmt(r.width)}px`, 0, y + (above ? -12 : 12)), "left", r.left, r.right, chrome);
        const beside = painter.beside(r, chrome), x = beside ? r.right + 10 : r.right - 10;
        painter.box("ln dim-height", x, r.top, 1, r.height);
        const l = painter.label("sz", `${fmt(r.height)}px`, x + (beside ? 8 : -8), 0);
        l.style.transform = beside ? "translate(0, -50%)" : "translate(-100%, -50%)";
        painter.place(l, "top", r.top, r.bottom, chrome);
      }
      const supported = resizeSupported(el);
      els.handle.disabled = !supported;
      els.handle.setAttribute("aria-label", `Adjust the width of ${name(el)}: ${fmt(r.width)}px`);
      if (!supported && !this.blockedText()) this.setBlocked(null, "transformed: edit the CSS value instead");
      const half = els.handle.offsetWidth / 2 || 16;
      const hx = Math.min(Math.max(r.right, half), innerWidth - half), hy = Math.min(Math.max(r.bottom, half), innerHeight - half);
      els.handle.style.left = `${hx}px`;
      els.handle.style.top = `${hy}px`;
      const reset = els.hreset, w = reset.offsetWidth || 50, h = reset.offsetHeight || 20, gap = half + 6;
      reset.toggleAttribute("data-on", this.sized.has(el));
      reset.style.left = `${Math.max(4, hx + gap + w > innerWidth - 4 ? hx - gap - w : hx + gap)}px`;
      reset.style.top = `${Math.max(4, Math.min(hy - h / 2, innerHeight - h - 4))}px`;
    }
  };

  // src/tools/picker.js
  var Picker = class {
    constructor(ui) {
      this.ui = ui;
      this.picking = false;
      this.picks = /* @__PURE__ */ new Map();
      this.focusEl = null;
      this.probe = null;
      this.alt = false;
      ui.tools.register("picking", {
        label: "Quick view · hover an element · Esc to cancel",
        handlers: () => ({
          move: (target, event) => {
            this.alt = event.altKey;
            if (target !== this.probe || this.alt !== this.altWas) {
              this.probe = target;
              this.altWas = this.alt;
              ui.paint();
            }
          },
          leave: () => this.setProbe(null),
          click: (target) => ui.quick(true, target),
          // a click opens the quick view's box on that element; the hover keeps painting
          escape: () => {
            this.setPicking(false);
            ui.btn.focus();
          },
          key: (event) => {
            if (event.key === "Alt" && this.alt !== (event.type === "keydown")) {
              this.alt = event.type === "keydown";
              ui.paint();
            }
          }
        }),
        arm: () => this.crosshair(true),
        release: () => {
          this.crosshair(false);
          this.probe = null;
        }
      });
    }
    crosshair(on) {
      this.cursorStyle ||= Object.assign(document.createElement("style"), { textContent: "html, html *:not(fm-inspector) { cursor: crosshair !important; }" });
      if (on) document.head.append(this.cursorStyle);
      else this.cursorStyle.remove();
    }
    setProbe(el) {
      if (el === this.probe) return;
      this.probe = el;
      this.ui.paint();
    }
    setPicking(on) {
      if (on === this.picking) return;
      this.picking = on;
      this.ui.btn.setAttribute("aria-pressed", String(on));
      this.ui.host.toggleAttribute("picking", on);
      if (on) this.ui.tools.arm("picking");
      else {
        this.alt = false;
        this.clear();
        this.ui.tools.end("picking");
        this.ui.quick(false);
      }
    }
    prune(isHelper) {
      for (const [el] of this.picks) if (!el.isConnected || isHelper(el)) this.picks.delete(el);
      if (!this.focusEl?.isConnected || isHelper(this.focusEl)) this.focusEl = [...this.picks.keys()].pop() || null;
    }
    select(el) {
      let row = this.ui.rows().get(el);
      if (!row) {
        this.ui.loadHtml();
        row = this.ui.rows().get(el);
      }
      if (!row) return;
      const was = this.picks.has(el);
      this.pick(el, row);
      if (was) return;
      this.ui.openCssFor(el);
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
      this.ui.setPickedRow(row, on);
      if (on) this.focusEl = el;
      else if (this.focusEl === el) this.focusEl = [...this.picks.keys()].pop() || null;
      this.ui.markHits();
      this.ui.paint();
    }
    clear() {
      for (const [, p] of this.picks) {
        this.ui.setPickedRow(p.row, false);
        p.row.style.removeProperty("--accent");
      }
      this.picks.clear();
      this.focusEl = null;
      this.ui.markHits();
      this.ui.paint();
    }
  };

  // src/tools/lens.js
  var Lens = class {
    constructor(ui) {
      this.ui = ui;
      this.armed = null;
      this.scope = { html: null, css: null };
      for (const which of ["html", "css"]) ui.tools.register(which, {
        label: "Click an element · Esc to cancel",
        handlers: () => ({
          move: (target) => ui.probe(target),
          leave: () => ui.probe(null),
          click: (target) => this.choose(which, target),
          escape: () => {
            this.arm(which, false);
            ui.btn(which).focus();
          }
        }),
        arm: () => ui.crosshair(true),
        release: () => {
          ui.crosshair(false);
          ui.probe(null);
        }
      });
    }
    arm(which, on = this.armed !== which) {
      if (on === (this.armed === which)) return;
      if (on && this.armed) {
        const was = this.armed;
        this.armed = null;
        this.ui.btn(was).setAttribute("aria-pressed", "false");
        this.ui.tools.end(was);
      }
      this.armed = on ? which : null;
      this.ui.host.toggleAttribute("lens", !!this.armed);
      this.ui.btn(which).setAttribute("aria-pressed", String(on));
      if (on) this.ui.tools.arm(which);
      else this.ui.tools.end(which);
      this.ui.paint();
    }
    choose(which, el) {
      this.scope[which] = el;
      this.ui.show(which, el);
    }
    prune(isHelper) {
      let changed = false;
      for (const which of ["html", "css"]) if (this.scope[which] && (!this.scope[which].isConnected || isHelper(this.scope[which]))) {
        this.scope[which] = null;
        changed = true;
      }
      return changed;
    }
  };

  // src/panel/html-view.js
  var HtmlView = class {
    constructor(ui) {
      this.ui = ui;
      this.rows = /* @__PURE__ */ new Map();
      this.scope = null;
      this.around = null;
    }
    setPickedRow(row, on) {
      row.dataset.picked = String(on);
      row.pickButton?.setAttribute("aria-pressed", String(on));
    }
    load() {
      markForeign();
      const folds = new Set([...this.rows].filter(([, row]) => row.hasAttribute("data-folded")).map(([el]) => el));
      const focused = this.ui.activeElement()?.closest(".row")?.pageElement;
      this.rows = /* @__PURE__ */ new Map();
      this.ui.view.replaceChildren();
      const fragment = document.createDocumentFragment();
      const scope = this.scope?.isConnected ? this.scope : null, parent = scope?.parentElement;
      const around = scope ? this.around === "children" || parent ? this.around : null : null;
      if (around === "content") fragment.append(this.contentBlock(scope));
      else if (around === "children" && ![...scope.children].some((c) => !skip(c))) fragment.append(this.note(`${name(scope)} has no child elements.`));
      else if (around === "parent") this.tree(fragment, parent, 0);
      else if (around === "siblings") this.forest(fragment, parent, 0);
      else this.tree(fragment, scope || document.body, 0);
      this.ui.view.replaceChildren(fragment);
      for (const el of folds) {
        const row = this.rows.get(el);
        if (row) this.setFolded(row, true);
      }
      if (around === "siblings" || around === "parent") for (const c of parent.children) {
        const r = this.rows.get(c);
        if (c !== scope && r?.close) this.setFolded(r, true);
      }
      if (around === "children") for (const c of scope.children) {
        const r = this.rows.get(c);
        if (r?.close) this.setFolded(r, true);
      }
      if (scope) {
        const root = this.rows.get(scope);
        if (root) {
          root.dataset.scope = "true";
          if (root.tx && root.hasAttribute("data-folded")) this.setFolded(root, false);
        }
      }
      this.ui.prune();
      for (const [el, pick] of this.ui.picks) {
        pick.row = this.rows.get(el);
        if (!pick.row) continue;
        this.setPickedRow(pick.row, true);
        pick.row.style.setProperty("--accent", `var(--pick-${pick.hue % PALETTE})`);
      }
      if (focused) this.rows.get(focused)?.pickButton.focus();
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
      select.addEventListener("click", () => this.ui.onPick(el, row));
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
      this.forest(out, el, depth + 1, kids);
      const close = this.row(depth);
      close.classList.add("cl", "nc");
      close.append(span("tag", `</${el.localName}>`));
      out.append(close);
      row.close = close;
    }
    forest(out, el, depth, kids = [...el.childNodes].filter((n) => !skip(n))) {
      for (const n of kids) {
        if (n.nodeType === 1) this.tree(out, n, depth);
        else {
          const child = this.row(depth);
          child.classList.add("nc");
          child.append(span(n.nodeType === 8 ? "c" : "tx", n.nodeType === 8 ? `<!--${n.data}-->` : squash(n.data)));
          out.append(child);
        }
      }
    }
    contentBlock(el) {
      const box = document.createElement("div");
      box.className = "hc";
      const row = (label, value, href) => {
        const r = document.createElement("div");
        r.className = "hcr";
        r.append(span("hcl", label));
        if (href) {
          const a = document.createElement("a");
          a.href = href;
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.textContent = value;
          r.append(a);
        } else r.append(span("hcv", value));
        box.append(r);
      };
      const text = (n) => squash(n.textContent || "").trim();
      const tag = el.localName;
      const head = document.createElement("div");
      head.className = "hch";
      head.append(span("re", name(el)));
      box.append(head);
      if (tag === "img") {
        const pic = document.createElement("img");
        pic.src = el.currentSrc || el.src;
        pic.alt = "";
        pic.className = "hcpic";
        box.append(pic);
        row("image", el.currentSrc || el.getAttribute("src") || "", el.currentSrc || el.src);
        row("alt", el.alt || "(none)");
        if (el.naturalWidth) row("natural", `${el.naturalWidth} × ${el.naturalHeight}px`);
      } else if (tag === "a") {
        row("link", el.getAttribute("href") || "(no href)", el.href);
        row("text", text(el) || "(empty)");
      } else if (/^(video|audio|iframe|source|embed|object)$/.test(tag)) {
        row(tag, el.currentSrc || el.src || el.data || el.getAttribute("src") || "(no source)", el.currentSrc || el.src || el.data);
      } else if (/^(input|textarea|select)$/.test(tag)) {
        row("value", el.value || "(empty)");
        if (el.placeholder) row("placeholder", el.placeholder);
      } else if (tag === "svg") {
        const pic = el.cloneNode(true);
        pic.classList.add("hcpic");
        pic.removeAttribute("id");
        box.append(pic);
        row("vector", `${el.children.length} shapes`);
      } else {
        row("text", text(el) || "(no text)");
        for (const i of el.querySelectorAll("img")) row("image", i.getAttribute("src") || "", i.src);
        for (const a of el.querySelectorAll("a[href]")) row("link", `${text(a) || a.getAttribute("href")}`, a.href);
      }
      return box;
    }
    note(text) {
      const n = document.createElement("div");
      n.className = "empty";
      n.textContent = text;
      return n;
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
      if (this.ui.view.hidden) return;
      const body = this.ui.body.getBoundingClientRect(), b = row.getBoundingClientRect();
      if (b.top < body.top || b.bottom > body.bottom) this.ui.body.scrollTop += b.top - body.top - this.ui.body.clientHeight / 2;
    }
  };

  // src/css/defaults.js
  var BLOCK = "display: block; unicode-bidi: isolate";
  var H = (size, margin) => `${BLOCK}; font-size: ${size}; font-weight: bold; margin-block: ${margin}`;
  var DEFAULTS = {
    html: "display: block",
    body: "display: block; margin: 8px",
    main: BLOCK,
    section: BLOCK,
    article: BLOCK,
    nav: BLOCK,
    aside: BLOCK,
    header: BLOCK,
    footer: BLOCK,
    div: BLOCK,
    address: `${BLOCK}; font-style: italic`,
    p: `${BLOCK}; margin-block: 1em`,
    h1: H("2em", "0.67em"),
    h2: H("1.5em", "0.83em"),
    h3: H("1.17em", "1em"),
    h4: H("1em", "1.33em"),
    h5: H("0.83em", "1.67em"),
    h6: H("0.67em", "2.33em"),
    blockquote: `${BLOCK}; margin-block: 1em; margin-inline: 40px`,
    figure: `${BLOCK}; margin-block: 1em; margin-inline: 40px`,
    figcaption: BLOCK,
    hr: `${BLOCK}; color: gray; border-style: inset; border-width: 1px; margin-block: 0.5em; margin-inline: auto; overflow: hidden`,
    pre: `${BLOCK}; font-family: monospace; white-space: pre; margin-block: 1em`,
    ul: `${BLOCK}; list-style-type: disc; margin-block: 1em; padding-inline-start: 40px`,
    ol: `${BLOCK}; list-style-type: decimal; margin-block: 1em; padding-inline-start: 40px`,
    menu: `${BLOCK}; list-style-type: disc; margin-block: 1em; padding-inline-start: 40px`,
    li: "display: list-item; text-align: match-parent; unicode-bidi: isolate",
    dl: `${BLOCK}; margin-block: 1em`,
    dt: BLOCK,
    dd: `${BLOCK}; margin-inline-start: 40px`,
    table: "display: table; box-sizing: border-box; border-spacing: 2px; border-collapse: separate; text-indent: initial; unicode-bidi: isolate",
    caption: "display: table-caption; text-align: center; unicode-bidi: isolate",
    thead: "display: table-header-group; vertical-align: middle; unicode-bidi: isolate",
    tbody: "display: table-row-group; vertical-align: middle; unicode-bidi: isolate",
    tfoot: "display: table-footer-group; vertical-align: middle; unicode-bidi: isolate",
    tr: "display: table-row; vertical-align: inherit; unicode-bidi: isolate",
    td: "display: table-cell; padding: 1px; vertical-align: inherit; unicode-bidi: isolate",
    th: "display: table-cell; padding: 1px; font-weight: bold; text-align: center; vertical-align: inherit; unicode-bidi: isolate",
    a: "color: -webkit-link; text-decoration: underline; cursor: pointer",
    b: "font-weight: bold",
    strong: "font-weight: bold",
    i: "font-style: italic",
    em: "font-style: italic",
    cite: "font-style: italic",
    var: "font-style: italic",
    dfn: "font-style: italic",
    code: "font-family: monospace",
    kbd: "font-family: monospace",
    samp: "font-family: monospace",
    tt: "font-family: monospace",
    small: "font-size: smaller",
    big: "font-size: larger",
    sub: "vertical-align: sub; font-size: smaller",
    sup: "vertical-align: super; font-size: smaller",
    u: "text-decoration: underline",
    ins: "text-decoration: underline",
    s: "text-decoration: line-through",
    strike: "text-decoration: line-through",
    del: "text-decoration: line-through",
    mark: "background-color: yellow; color: black",
    abbr: "text-decoration: underline dotted",
    q: "display: inline",
    img: "display: inline; overflow: clip; overflow-clip-margin: content-box",
    picture: "display: inline",
    video: "display: inline-block; object-fit: contain",
    audio: "display: none",
    canvas: "display: inline-block",
    iframe: "border: 2px inset",
    input: "display: inline-block; appearance: auto; font: -webkit-small-control; letter-spacing: normal; word-spacing: normal; line-height: normal; text-transform: none; text-indent: 0; text-shadow: none; text-align: start; margin: 0; padding: 1px 0; border: 2px inset; cursor: text; background-color: field; color: fieldtext",
    button: "display: inline-block; appearance: auto; font: -webkit-small-control; letter-spacing: normal; word-spacing: normal; line-height: normal; text-transform: none; text-indent: 0; text-shadow: none; text-align: center; align-items: flex-start; box-sizing: border-box; margin: 0; padding: 1px 6px; border: 2px outset buttonborder; background-color: buttonface; color: buttontext; cursor: default",
    select: "display: inline-block; appearance: auto; font: -webkit-small-control; box-sizing: border-box; margin: 0; border: 1px solid; border-radius: 0; white-space: pre; cursor: default; background-color: field; color: fieldtext",
    textarea: "display: inline-block; appearance: auto; font: -webkit-small-control; margin: 0; padding: 2px; border: 1px solid; white-space: pre-wrap; resize: auto; cursor: text; background-color: field; color: fieldtext",
    label: "cursor: default",
    fieldset: `${BLOCK}; margin-inline: 2px; padding-block: 0.35em 0.625em; padding-inline: 0.75em; border: 2px groove threedface; min-inline-size: min-content`,
    legend: `${BLOCK}; padding-inline: 2px`,
    details: "display: block",
    summary: "display: list-item; cursor: default",
    dialog: "position: absolute; inset-inline: 0; inline-size: fit-content; block-size: fit-content; margin: auto; border: solid; padding: 1em; background-color: canvas; color: canvastext",
    span: "display: inline",
    br: "display: inline",
    wbr: "display: inline"
  };
  var defaultDecls = (tag) => (DEFAULTS[tag] || "").split(";").map((s) => s.trim()).filter(Boolean).map((s) => {
    const at = s.indexOf(":");
    return { type: "decl", prop: s.slice(0, at).trim(), value: s.slice(at + 1).trim(), important: false, on: true, live: false };
  });

  // src/panel/css-view.js
  var INHERITED = /^(--|color$|cursor$|direction$|font|letter-spacing$|line-height$|list-style|quotes$|tab-size$|text-align|text-indent$|text-transform$|text-shadow$|text-rendering$|visibility$|white-space|word-spacing$|word-break$|overflow-wrap$|hyphens$|writing-mode$|caption-side$|border-collapse$|border-spacing$|empty-cells$|orphans$|widows$|caret-color$|accent-color$|color-scheme$|image-rendering$|pointer-events$|text-decoration-skip|text-underline|-webkit-text-size-adjust$|-webkit-font-smoothing$)/;
  var SOURCES = ["author", "browser", "inherited", "os", "layout", "currentcolor", "initial"];
  var SOURCE_NAMES = { author: "Author", browser: "Browser", inherited: "Inherited", os: "OS", layout: "Layout", currentcolor: "Currentcolor", initial: "Initial" };
  var SOURCE_NOTES = {
    author: "Values the page's own stylesheets set on this element, its rules and inline style. They win over the browser's defaults.",
    browser: "Values from the browser's default stylesheet for this tag, as this tool's table of the defaults knows them. A struck row is one an author rule overrides.",
    inherited: "Values an ancestor's rule set and this element inherits, like the text colour and the font. Nothing on the element itself sets them.",
    os: "Values CSS leaves to the platform: the default font and size, the text colour, the accent. The browser reads them from the OS and user settings.",
    layout: "Values no rule sets. The layout works them out from the box and its content: auto sizes, origins and grid tracks, in pixels.",
    currentcolor: (color) => `Colour properties with no colour of their own. They follow the element's color, ${color} here, so a change to color changes them too.`,
    initial: "Properties still at the initial value CSS defines for every element. Nothing on the page changes them."
  };
  var SHORTHANDS = [
    [/^border-(top|right|bottom|left|block|inline|block-start|block-end|inline-start|inline-end)-(width|style|color)$/, (m) => [`border-${m[1]}`, `border-${m[2]}`, "border"]],
    [/^border-(top|right|bottom|left|block|inline)$/, () => ["border"]],
    [/^border-(block|inline)-(start|end)-(width|style|color)$/, (m) => [`border-${m[1]}-${m[3]}`, `border-${m[1]}`]],
    [/^border-(block|inline)-(start|end)$/, (m) => [`border-${m[1]}`, "border"]],
    [/-radius$/, () => ["border-radius"]],
    [/^border-image-/, () => ["border-image"]],
    [/^(margin|padding|inset|scroll-margin|scroll-padding)-(top|right|bottom|left)$/, (m) => [m[1]]],
    [/^(margin|padding|inset|scroll-margin|scroll-padding)-(block|inline)-(start|end)$/, (m) => [`${m[1]}-${m[2]}`, m[1]]],
    [/^(top|right|bottom|left)$/, () => ["inset"]],
    [/^overflow-(x|y|block|inline)$/, () => ["overflow"]],
    [/^overscroll-behavior-/, () => ["overscroll-behavior"]],
    [/^flex-(grow|shrink|basis)$/, () => ["flex"]],
    [/^flex-(direction|wrap)$/, () => ["flex-flow"]],
    [/^(font-(family|size|weight|style|variant|stretch)|line-height)$/, () => ["font"]],
    [/^background-/, () => ["background"]],
    [/^grid-template-(rows|columns|areas)$/, () => ["grid-template", "grid"]],
    [/^grid-(row|column)-(start|end)$/, (m) => [`grid-${m[1]}`, "grid-area", "grid"]],
    [/^grid-auto-/, () => ["grid"]],
    [/^(row|column)-gap$/, () => ["gap"]],
    [/^(align|justify)-(items|content|self)$/, (m) => [`place-${m[2]}`]],
    [/^text-decoration-/, () => ["text-decoration"]],
    [/^text-emphasis-/, () => ["text-emphasis"]],
    [/^list-style-/, () => ["list-style"]],
    [/^outline-/, () => ["outline"]],
    [/^column-rule-/, () => ["column-rule"]],
    [/^column-(width|count)$/, () => ["columns"]],
    [/^transition-/, () => ["transition"]],
    [/^animation-/, () => ["animation"]],
    [/^mask-/, () => ["mask"]],
    [/^container-/, () => ["container"]],
    [/^contain-intrinsic-/, () => ["contain-intrinsic-size"]],
    [/^(min-|max-)?(inline|block)-size$/, () => []]
  ];
  var OS_PROPS = /* @__PURE__ */ new Set(["font-family", "font-size", "line-height", "color", "accent-color", "caret-color", "color-scheme", "scrollbar-color", "scrollbar-width", "text-rendering", "forced-color-adjust"]);
  function candidates(prop, style = {}) {
    const mode = style.writingMode || "horizontal-tb", rtl = style.direction === "rtl";
    const vertical = /^(vertical|sideways)/.test(mode), lr = /-lr$/.test(mode);
    const inlineReverse = rtl !== (mode === "sideways-lr");
    const sideTwin = vertical ? { [lr ? "left" : "right"]: "block-start", [lr ? "right" : "left"]: "block-end", [inlineReverse ? "bottom" : "top"]: "inline-start", [inlineReverse ? "top" : "bottom"]: "inline-end", width: "block-size", height: "inline-size" } : { top: "block-start", bottom: "block-end", [rtl ? "right" : "left"]: "inline-start", [rtl ? "left" : "right"]: "inline-end", width: "inline-size", height: "block-size" };
    const out = /* @__PURE__ */ new Set([prop]), physical = (lg) => Object.keys(sideTwin).find((k) => sideTwin[k] === lg);
    if (/^(top|bottom|left|right)$/.test(prop)) out.add(`inset-${sideTwin[prop]}`);
    const ins = /^inset-(block|inline)-(start|end)$/.exec(prop);
    if (ins) out.add(physical(`${ins[1]}-${ins[2]}`));
    const corner = /^border-(top|bottom)-(left|right)-radius$/.exec(prop), lcorner = /^border-(start|end)-(start|end)-radius$/.exec(prop);
    if (corner) {
      const sides2 = [sideTwin[corner[1]], sideTwin[corner[2]]];
      out.add(`border-${sides2.find((s) => s.startsWith("block-")).slice(6)}-${sides2.find((s) => s.startsWith("inline-")).slice(7)}-radius`);
    } else if (lcorner) {
      const sides2 = [physical(`block-${lcorner[1]}`), physical(`inline-${lcorner[2]}`)];
      out.add(`border-${sides2.find((s) => /^(top|bottom)$/.test(s))}-${sides2.find((s) => /^(left|right)$/.test(s))}-radius`);
    } else for (const [ph, lg] of Object.entries(sideTwin)) {
      if (prop === ph) out.add(lg);
      else if (prop === lg) out.add(ph);
      else if (/^(width|height)$/.test(ph)) {
        for (const pre of ["min-", "max-", "contain-intrinsic-"]) {
          if (prop === `${pre}${ph}`) out.add(`${pre}${lg}`);
          else if (prop === `${pre}${lg}`) out.add(`${pre}${ph}`);
        }
      } else if (prop.includes(`-${ph}`)) out.add(prop.replace(`-${ph}`, `-${lg}`));
      else if (prop.includes(`-${lg}`)) out.add(prop.replace(`-${lg}`, `-${ph}`));
    }
    for (const base of [...out]) for (const [re, expand] of SHORTHANDS) {
      const m = re.exec(base);
      if (m) for (const sh of expand(m)) out.add(sh);
    }
    if (prop !== "direction" && prop !== "unicode-bidi" && !prop.startsWith("--")) out.add("all");
    return [...out];
  }
  var CssView = class {
    constructor(ui) {
      this.ui = ui;
      this.rowOf = /* @__PURE__ */ new Map();
      this.openWhy = null;
      ui.view.addEventListener("click", (e) => {
        if (!e.composedPath().some((n) => n.classList?.contains("why"))) this.closeWhy();
      });
      this.groups = [];
      this.pins = /* @__PURE__ */ new Set();
      this.hover = null;
      this.editor = null;
      this.pendingRender = false;
      this.scope = null;
      this.defaults = false;
      this.cascade = false;
      this.limits = false;
      this.initials = false;
      this.overrides = false;
      this.source = null;
      this.sizePick = null;
      this.sizeScope = null;
      this.sourceKey = "";
      this.sourceScope = null;
    }
    limit(text) {
      const n = document.createElement("div");
      n.className = "lim";
      n.textContent = text;
      return n;
    }
    rules(nodes, out = []) {
      for (const n of nodes) {
        if (n.type === "rule") out.push(n);
        if (n.children) this.rules(n.children, out);
      }
      return out;
    }
    shows(n) {
      if (!this.scope) return true;
      if (n.type !== "rule") return false;
      return !!n.model && this.ui.store.matchModel(n.model, [this.scope]).length > 0;
    }
    onBuilt() {
      if (!this.editor) this.render();
      else this.pendingRender = true;
    }
    dropped(d) {
      if (this.hover === d) this.hover = null;
    }
    // the store dropped a declaration the page removed
    clearMarks() {
      this.pins.clear();
      this.hover = null;
      this.markHits();
      for (const r of this.rowOf.values()) {
        r.row.classList.remove("on");
        r.row.querySelector(".t")?.setAttribute("aria-pressed", "false");
      }
    }
    render() {
      const { view, store } = this.ui;
      const active = view.getRootNode().activeElement, held = active && view.contains(active) ? [...this.rowOf].find(([, r]) => r.row.contains(active))?.[0] : null;
      const link2 = active && view.contains(active) && active.classList.contains("srcb") ? active.textContent : null;
      view.replaceChildren();
      this.hover = null;
      this.rowOf = /* @__PURE__ */ new Map();
      this.groups = [];
      if (held) queueMicrotask(() => {
        const r = this.rowOf.get(held);
        if (r && view.contains(r.row)) r.value.focus();
      });
      else if (link2) queueMicrotask(() => {
        const links = [...view.querySelectorAll(".srcs .srcb")];
        (links.find((b) => b.textContent === link2) || links[0])?.focus();
      });
      if (!store.sheets.length && !store.inlineNodes?.length) {
        view.append(this.note("No stylesheet on this page."));
        return;
      }
      const scope = this.scope?.isConnected ? this.scope : null;
      this.scope = scope;
      const allRules = () => store.sheets.filter((s) => !s.unread).flatMap((s) => this.rules(s.nodes));
      const ownModels = new Set(scope ? allRules().filter((n) => n.model && store.matchModel(n.model, [scope]).length > 0).map((n) => n.model) : []);
      if (scope && this.defaults) {
        const decls = defaultDecls(scope.localName);
        view.append(this.comment("/* browser defaults */"));
        view.append(this.note("The defaults as this tool's table knows them. The browser's own sheet adds rules by attribute and state (an input's type, a disabled control), and browsers differ."));
        if (decls.length) view.append(this.group({ type: "rule", head: scope.localName, decls, model: null }, { depth: 0 }));
        else view.append(this.note(`No default rule for ${name(scope)} beyond display: inline.`));
      }
      if (scope && this.cascade) {
        const seen = new Set(ownModels);
        const ancestors = [];
        for (let a = scope.parentElement; a; a = a.parentElement) ancestors.unshift(a);
        let any = false;
        for (const a of ancestors) {
          const nodes = [...allRules(), ...(store.inlineNodes || []).filter((n) => n.model.inlineEl === a)].filter((n) => n.model && !seen.has(n.model) && (n.model.inlineEl ? n.model.inlineEl === a : store.matchModel(n.model, [a]).length > 0)).map((n) => ({ ...n, decls: n.decls.filter((d) => d.type !== "decl" || INHERITED.test(d.prop)) })).filter((n) => n.decls.some((d) => d.type === "decl"));
          if (!nodes.length) continue;
          any = true;
          view.append(this.comment(`/* inherited from ${name(a)} */`));
          for (const n of nodes) {
            seen.add(n.model);
            const g = this.group(n, { depth: 0 });
            if (n.model.inlineEl) g.classList.add("inline");
            view.append(g);
          }
        }
        if (!any) view.append(this.note("Nothing inherited from the ancestors' rules."));
      }
      if (scope && this.limits) {
        const kin = (i) => i === 1 ? "parent" : i === 2 ? "grandparent" : i === 3 ? "great-grandparent" : `ancestor ${i}`;
        const ladder = sizeLadder(store, scope);
        if (ladder.length) ladder.push({ el: null, name: "viewport", w: innerWidth, h: innerHeight, width: ["the browser window"], height: ["the browser window"] });
        const label = (entry, i) => entry.el === null ? "Viewport" : i === 0 ? "Element" : entry.el === document.body ? "Body" : kin(i).replace(/^./, (c) => c.toUpperCase());
        if (scope !== this.sizeScope || this.sizePick >= ladder.length) this.sizePick = null;
        this.sizeScope = scope;
        if (ladder.length > 1) {
          const links = document.createElement("div");
          links.className = "srcs";
          [["All", null], ...ladder.map((entry, i) => [label(entry, i), i])].forEach(([word, i]) => {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "srcb";
            b.textContent = word;
            b.setAttribute("aria-pressed", String(this.sizePick === i));
            b.addEventListener("click", (e) => {
              e.stopPropagation();
              this.sizePick = i === null || this.sizePick === i ? null : i;
              this.render();
            });
            links.append(b);
          });
          view.append(links);
        }
        ladder.forEach((entry, i) => {
          const extra = i === 0 ? this.ui.sizeExtra(entry.el) : [];
          if (this.sizePick !== null) {
            if (i === this.sizePick) view.append(...sizeRows(entry, true, i && entry.el ? kin(i) : ""), ...extra);
            return;
          }
          if (i === 1) {
            view.append(Object.assign(document.createElement("hr"), { className: "lsep" }));
            const head = document.createElement("div");
            head.className = "lim lhead";
            head.textContent = "up the tree";
            view.append(head);
            view.append(this.note("The boxes around the element, up to the viewport."));
          }
          view.append(...sizeRows(entry, true, i && entry.el ? kin(i) : ""), ...extra);
        });
      }
      if (scope && (this.initials || this.overrides)) {
        const all = this.cascade_(scope), clashes = new Set(all.filter((r) => r.over && r.src === "browser").map((r) => r.prop));
        const rows = this.overrides ? all.filter((r) => clashes.has(r.prop) && r.src !== "initial" && r.src !== "os") : all;
        view.append(this.comment(this.overrides ? "/* computed: the author's values over the browser's defaults */" : "/* every property, with what sets it and what it overrides */"));
        const key = this.overrides ? "o" : "i";
        if (key !== this.sourceKey || scope !== this.sourceScope || !rows.some((r) => r.src === this.source)) this.source = null;
        this.sourceKey = key;
        this.sourceScope = scope;
        view.append(this.stackGroup(rows));
      }
      if (scope && (this.limits || this.cascade || this.defaults || this.initials || this.overrides)) {
        this.markHits();
        return;
      }
      const ownStart = document.createComment("own");
      view.append(ownStart);
      const before = this.groups.length;
      for (const s of store.sheets) {
        if (store.sheets.length > 1 && !scope) view.append(this.comment(`/* ${s.name} */`));
        if (s.unread) {
          if (!scope) view.append(this.comment("/* stylesheet could not be read */"));
          continue;
        }
        this.renderNodes(view, s.nodes, 0);
      }
      if (scope && this.groups.length === before && !(store.inlineNodes || []).some((n) => n.model.inlineEl === scope)) view.append(this.note("No rule reaches this element."));
      for (const n of store.inlineNodes || []) {
        const el = n.model.inlineEl;
        if (scope && el !== scope) continue;
        const matches = this.groups.slice(before).filter((x) => x.node !== n && x.node.model && !x.node.model.inlineEl && store.matchModel(x.node.model, [el]).length > 0);
        const first = matches.find((x) => !/^\*/.test(x.node.model.selector || "")) || matches[0];
        const g = this.group(n, { depth: 0 });
        g.classList.add("inline");
        if (first) first.el.before(g);
        else ownStart.after(g);
      }
      this.markHits();
    }
    markHits() {
      const { el, hue } = this.ui.focusPick();
      for (const { node, el: g } of this.groups) {
        let hit = false;
        if (el && node.model) hit = this.ui.store.matchModel(node.model, [el]).length > 0;
        g.classList.toggle("hit", hit);
        if (hit) g.style.setProperty("--accent", `var(--pick-${hue % PALETTE})`);
        else g.style.removeProperty("--accent");
      }
    }
    scrollToHit() {
      const hits = this.groups.filter((x) => x.el.classList.contains("hit"));
      const first = (hits.find((x) => !/^\*/.test(x.node.model.selector || "")) || hits[0])?.el;
      if (!first) return;
      const body = this.ui.body.getBoundingClientRect();
      this.ui.body.scrollTop += first.getBoundingClientRect().top - body.top - 8;
    }
    cascade_(scope) {
      const store = this.ui.store;
      const hidden = document.createElement("div");
      hidden.setAttribute("data-fm-inspector-ignore", "");
      hidden.style.display = "none";
      const probe = document.createElement("div");
      probe.style.cssText = "all: initial; direction: ltr; unicode-bidi: normal;";
      hidden.append(probe);
      document.body.append(hidden);
      const pcs = getComputedStyle(probe), ecs = getComputedStyle(scope);
      const declsOf = (models) => {
        const map = /* @__PURE__ */ new Map();
        for (const m of models) for (const d of m.decls) if (d.type === "decl" && d.on && d.live !== false) map.set(d.prop, d);
        return map;
      };
      const author = declsOf(rulesOf(store, scope)), browser = new Map(defaultDecls(scope.localName).map((d) => [d.prop, d]));
      const chain = [];
      for (let a = scope.parentElement; a; a = a.parentElement) chain.push({ a, decls: declsOf(rulesOf(store, a)) });
      const hit = (map, prop) => {
        for (const c of candidates(prop, ecs)) if (map.has(c)) return map.get(c);
        return null;
      };
      const initialRow = (prop) => OS_PROPS.has(prop) ? { src: "os", note: "initial, set by the OS", why: "No fixed initial in CSS. The browser takes it from the OS and user settings." } : { src: "initial", note: "initial" };
      const via = (who, d, prop) => `set by the ${who}${d.prop === prop ? "" : ` via ${d.prop}`}`;
      const rows = [];
      for (const prop of [...pcs].filter((p) => !p.startsWith("-")).sort()) {
        const value = ecs.getPropertyValue(prop), initial = pcs.getPropertyValue(prop);
        const a = hit(author, prop), b = hit(browser, prop);
        let winner;
        if (a) winner = { value, src: "author", note: via("author", a, prop) };
        else if (b) winner = { value, src: "browser", note: via("browser", b, prop), why: `No author rule. It comes from the browser's default stylesheet for <${scope.localName}>.` };
        else if (value !== initial && INHERITED.test(prop)) {
          const from = chain.find((c) => hit(c.decls, prop));
          winner = { value, src: "inherited", note: from ? `inherited from ${name(from.a)}` : "inherited" };
        } else if (value !== initial && /-color$/.test(prop) && value === ecs.color) {
          rows.push({ prop, value: "currentcolor", src: "currentcolor", note: `from color: ${value}`, why: `No colour of its own: currentcolor takes the element's color, ${value} here.` });
          continue;
        } else if (value !== initial) winner = { value, src: "layout", note: "resolved by the layout", why: "No rule sets it. The layout worked the value out from the box, in pixels." };
        else winner = { value: initial, ...initialRow(prop) };
        if (winner.src !== "initial" && winner.src !== "os") rows.push({ prop, value: initial, ...initialRow(prop), over: true });
        if (b && winner.src === "author" && b.value !== initial) rows.push({ prop, value: b.value, src: "browser", note: via("browser", b, prop), over: true });
        rows.push({ prop, ...winner });
      }
      hidden.remove();
      return rows;
    }
    stackGroup(all) {
      const present = SOURCES.filter((k) => all.some((r) => r.src === k));
      const rows = this.source ? all.filter((r) => r.src === this.source && (!r.over || this.overrides)) : all;
      const g = this.group({ type: "rule", head: "computed", decls: rows.map((r) => ({ type: "decl", prop: r.prop, value: r.value, important: false, on: true, live: false })), model: null }, { depth: 0 });
      if (present.length > 1) {
        const links = document.createElement("div");
        links.className = "srcs";
        for (const k of ["all", ...present]) {
          const b = document.createElement("button");
          b.type = "button";
          b.className = `srcb src-${k}`;
          b.textContent = k === "all" ? "All" : SOURCE_NAMES[k];
          b.setAttribute("aria-pressed", String((this.source || "all") === k));
          b.addEventListener("click", (e) => {
            e.stopPropagation();
            this.source = k === "all" || this.source === k ? null : k;
            this.render();
          });
          links.append(b);
        }
        g.querySelector(".gh").after(links);
        if (this.source) {
          const t = SOURCE_NOTES[this.source];
          const n = this.note(typeof t === "function" ? t(getComputedStyle(this.sourceScope).color) : t);
          n.classList.add("srcnote", `src-${this.source}`);
          links.after(n);
        }
      }
      g.querySelectorAll(".d").forEach((row, i) => {
        row.classList.add(`src-${rows[i].src}`);
        row.classList.toggle("over", !!rows[i].over);
        row.removeAttribute("title");
        const note = span("src", `(${rows[i].note})`);
        row.append(note);
        row.classList.add("wn");
        if (rows[i].why && !rows[i].over) note.append(this.whyButton(rows[i].why));
      });
      return g;
    }
    whyButton(text) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "whyb";
      b.setAttribute("aria-label", "Why");
      b.setAttribute("aria-expanded", "false");
      b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>';
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        const open = b.getAttribute("aria-expanded") === "true";
        this.closeWhy();
        if (open) return;
        const tip = document.createElement("div");
        tip.className = "why";
        tip.textContent = text;
        const row = b.closest(".d");
        row.append(tip);
        row.classList.add("wo");
        b.setAttribute("aria-expanded", "true");
        this.openWhy = { b, tip, row };
      });
      return b;
    }
    closeWhy() {
      if (!this.openWhy) return;
      this.openWhy.tip.remove();
      this.openWhy.row.classList.remove("wo");
      this.openWhy.b.setAttribute("aria-expanded", "false");
      this.openWhy = null;
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
      if (n.children?.length) this.renderNodes(g, n.children, (opts.depth || 0) + 1);
      return g;
    }
    comment(text) {
      const c = document.createElement("div");
      c.className = "cm";
      c.textContent = text;
      return c;
    }
    renderNodes(out, nodes, depth) {
      for (const n of nodes) {
        switch (n.type) {
          case "blank":
            break;
          case "comment":
            if (this.shows(n)) out.append(this.comment(n.text));
            break;
          case "flat":
            if (this.shows(n)) out.append(this.comment(n.text));
            break;
          case "opaque":
            if (this.shows(n)) out.append(this.comment(`${n.head} { … }`));
            break;
          case "group": {
            const inner = document.createDocumentFragment();
            this.renderNodes(inner, n.children, depth + 1);
            if (!inner.childNodes.length) break;
            const head = document.createElement("div");
            head.className = "gh";
            head.append(span("sel", n.head));
            out.append(head, inner);
            break;
          }
          case "rule": {
            if (this.shows(n)) {
              out.append(this.group(n, { depth }));
              break;
            }
            const inner = document.createDocumentFragment();
            this.renderNodes(inner, n.children || [], depth + 1);
            if (!inner.childNodes.length) break;
            const head = document.createElement("div");
            head.className = "gh";
            head.append(span("sel", n.head));
            out.append(head, inner);
            break;
          }
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
        const before = this.ui.state(d);
        d.on = box.checked;
        this.apply(d);
        this.syncRow(d);
        this.ui.record([{ d, before, after: this.ui.state(d) }]);
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
        this.ui.paint();
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
        this.ui.paint();
      });
      row.addEventListener("pointerleave", () => {
        this.hover = null;
        this.ui.paint();
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
      r.row.classList.toggle("block", d === this.ui.blocked());
      const color = isColor(d.prop, d.value);
      r.sw.hidden = !color;
      if (color) r.sw.style.background = d.value;
    }
    edit(d) {
      if (this.editor && !this.editor.finish(false)) this.editor.finish(true);
      const r = this.rowOf.get(d);
      if (!r) return;
      const { value } = r;
      const { store, status } = this.ui;
      const start = d.value, startOn = d.on;
      const model = d.model, startText = model.rule.style.cssText;
      const startAttribute = model.inlineEl?.getAttribute("style") ?? null;
      const cancelStyle = store.scratch(model, startText);
      let editorWrite = startText;
      const absorbOutside = () => {
        const live = model.rule.style.cssText;
        for (const { prop, value: value2, priority } of store.styleChanges(store.scratch(model, editorWrite), store.scratch(model, live))) {
          store.writeProperty(cancelStyle, prop, value2, priority);
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
        status.textContent = valid ? "" : "Invalid CSS value. Correct it, or press Escape to cancel.";
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
        if (!cancel && (d.value !== start || d.on !== startOn)) this.ui.record([{ d, before: { value: start, on: startOn, important: d.important }, after: this.ui.state(d) }]);
        if (cancel) {
          absorbOutside();
          store.rebaseBaseline(model);
          if (model.inlineEl && cancelStyle.cssText === startText) {
            if (startAttribute == null) model.inlineEl.removeAttribute("style");
            else model.inlineEl.setAttribute("style", startAttribute);
          } else model.rule.style.cssText = cancelStyle.cssText;
          d.value = start;
          d.on = startOn;
          const originally = store.scratch(model, startText);
          if (startOn && (originally.getPropertyValue(d.prop) !== cancelStyle.getPropertyValue(d.prop) || originally.getPropertyPriority(d.prop) !== cancelStyle.getPropertyPriority(d.prop))) {
            d.value = cancelStyle.getPropertyValue(d.prop) || start;
            d.on = cancelStyle.getPropertyValue(d.prop) !== "";
            d.important = cancelStyle.getPropertyPriority(d.prop) === "important";
          }
          model.sourceText = store.scratch(model, store.declarationText(model)).cssText;
          model.lastApplied = model.rule.style.cssText;
          this.ui.queueLoad();
          this.markHits();
          this.ui.paint();
        }
        status.textContent = "";
        field.replaceWith(value);
        this.syncRow(d);
        if (this.editor?.field === field) this.editor = null;
        if (restoreFocus) value.focus();
        if (this.pendingRender) {
          this.pendingRender = false;
          this.render();
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
      if (!value || !this.ui.store.validValue(d, value)) return false;
      d.value = value;
      d.on = true;
      this.apply(d);
      return true;
    }
    apply(d) {
      this.ui.store.write(d);
      for (const entry of d.model.decls) if (entry.type === "decl") this.syncRow(entry);
      this.markHits();
      this.ui.paint();
    }
  };

  // src/main.js
  var VERSION = "0.2.5";
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
      const $ = (s) => root.querySelector(s), self = this;
      this.rail = $(".rail");
      this.htmlBtn = $(".htmlbtn");
      this.cssBtn = $(".cssbtn");
      this.byeBtn = $(".bye");
      this.pickBtn = $(".pickbtn");
      this.measureBtn = $(".measure");
      this.sizeBtn = $(".sizebtn");
      this.wval = $(".wval");
      this.wblock = $(".wblock");
      this.handle = $(".hd");
      this.stateText = $(".state");
      this.tools = new Tools({
        onSwitch: (id) => this.solo(id),
        // one tool at a time: the others off, the box closed
        pickTarget: (event) => this.pickTarget(event),
        isHelper: helper,
        editing: () => !!this.editor || this.second,
        // an open edit, or the second box: Escape takes it first, the tool ends on the next
        cancelEdit: () => {
          if (this.editor) this.editor.finish(true, true);
          else this.closeSecond();
        },
        say: (text) => {
          this.stateText.textContent = text;
        },
        busy: () => !!this.cancelGesture
        // a gesture of the box's own is running
      });
      this.hresetBtn = $(".hreset");
      this.painter = new Painter($(".ov"));
      this.resize = new Resizer({
        host: this,
        els: { btn: this.sizeBtn, handle: this.handle, wval: this.wval, wnow: $(".wnow"), wblock: this.wblock, hreset: this.hresetBtn },
        tools: this.tools,
        painter: this.painter,
        get store() {
          return self.store;
        },
        paint: () => this.paint(),
        goTo: (el, d) => this.openSecond(el, d),
        toggleDecl: (d, on) => {
          const before = this.state(d);
          d.on = on;
          this.cssView.apply(d);
          this.cssView.syncRow(d);
          this.record([{ d, before, after: this.state(d) }]);
        },
        // the holding declaration's tick, from the resize view
        box: (on) => {
          if (on) {
            this.show("size");
            if (!this.hasAttribute("open")) this.toggle(true);
            this.avoidResizeHandle();
          } else if (this.view === "size" && this.hasAttribute("open")) this.toggle(false);
        },
        queueLoad: () => this.queueLoad(),
        dirtyHtml: () => {
          this.htmlDirty = true;
        },
        syncRow: (d) => this.syncRow(d),
        revealRow: (d) => {
          if (this.hasAttribute("open") && this.views.css.hidden && this.view !== "size") this.show("css");
          const row = this.rowOf.get(d)?.row;
          if (row && !this.views.css.hidden) row.scrollIntoView({ block: "center" });
        },
        gesture: (e, move, done) => this.gesture(e, move, done),
        suppressClick: () => this.suppressClick(),
        cancelGesture: () => this.cancelGesture?.(),
        finishEdit: () => {
          if (this.editor && !this.editor.finish(false)) this.editor.finish(true);
        }
      });
      this.hresetBtn.addEventListener("click", () => {
        this.resize.reset(this.resize.target);
        this.editor?.finish(true);
        this.reset();
        this.resize.setBlocked(null, "");
      });
      this.measuring = false;
      this.panel = $(".panel");
      this.head = $(".head");
      this.body = $(".body");
      this.closeBtn = $(".close");
      this.scopeBtn = $(".vscope");
      this.allBtn = $(".vall");
      this.defaultsBtn = $(".vdefaults");
      this.cascadeBtn = $(".vcascade");
      this.limitsBtn = $(".vlimits");
      this.initialsBtn = $(".vinitials");
      this.renderBtn = $(".vrender");
      this.aroundBtns = { parent: $(".vparent"), children: $(".vchildren"), siblings: $(".vsiblings"), content: $(".vcontent") };
      this.mode = { html: "scope", css: "scope" };
      this.resetBtn = $(".reset");
      this.history = new History(() => {
      });
      this.status = $(".status");
      this.pickSurface = $(".pick-surface");
      this.views = { html: $("#view-html"), css: $("#view-css"), quick: $("#view-quick"), size: $("#view-size") };
      this.panel2 = $("#panel2");
      this.p2body = this.panel2.querySelector(".body");
      this.p2title = $(".p2title");
      this.second = false;
      $(".p2close").addEventListener("click", () => this.closeSecond());
      this.panel2.querySelector(".head").addEventListener("pointerdown", (e) => {
        if (e.button !== 0 || this.phone() || e.target.closest("button")) return;
        e.preventDefault();
        const r = this.panel2.getBoundingClientRect(), from = { x: e.clientX, y: e.clientY, left: r.left, top: r.top };
        this.gesture(e, (event) => this.placeSecond(from.left + event.clientX - from.x, from.top + event.clientY - from.y), () => {
        });
      });
      this.picker = new Picker({
        host: this,
        btn: this.pickBtn,
        tools: this.tools,
        rows: () => this.htmlView.rows,
        loadHtml: () => this.loadHtml(),
        setPickedRow: (row, on) => this.htmlView.setPickedRow(row, on),
        openCssFor: (el) => {
          this.htmlView.reveal(el);
          this.openView("css", true);
          this.scrollToHit();
        },
        markHits: () => this.markHits(),
        paint: () => this.paint(),
        quick: (on, el) => {
          if (on) {
            this.quickEl = el;
            this.show("quick");
            if (!this.hasAttribute("open")) this.toggle(true);
            this.renderQuick(el, true);
            this.paint();
          } else {
            this.quickEl = null;
            this.quickKey = null;
            if (this.view === "quick" && this.hasAttribute("open")) this.toggle(false);
          }
        }
      });
      this.lens = new Lens({
        host: this,
        btn: (which) => which === "html" ? this.htmlBtn : this.cssBtn,
        tools: this.tools,
        crosshair: (on) => this.picker.crosshair(on),
        probe: (el) => this.picker.setProbe(el),
        paint: () => this.paint(),
        show: (which, el) => {
          this.mode[which] = "scope";
          this.applyScope(which);
          this.openView(which, true);
          if (which === "css") this.scrollToHit();
        }
      });
      this.htmlView = new HtmlView({
        view: this.views.html,
        body: this.body,
        activeElement: () => root.activeElement,
        picks: this.picker.picks,
        onPick: (el, row) => this.picker.pick(el, row),
        prune: () => this.prunePicks()
      });
      this.store = new CssStore({
        ownNode: (node) => node === this.picker.cursorStyle,
        signal: () => this.runtime.signal,
        alive: () => this.isConnected,
        sized: this.resize.sized,
        built: () => {
          this.cssView.onBuilt();
          this.paint();
        },
        keep: (model) => model.decls.some((d) => this.pins.has(d) || this.hover === d || this.editor?.declaration === d) || this.resize.blocked?.model === model || this.history.some((entry) => entry.some((step) => step.d.model === model)),
        // the undo history, or the blocked-resize mark, still points at it
        held: (d) => this.pins.has(d) || this.editor?.declaration === d,
        dropped: (d) => this.cssView.dropped(d)
      });
      this.cssView = new CssView({
        view: this.views.css,
        body: this.body,
        store: this.store,
        status: this.status,
        sizeExtra: (el) => this.contentRows(el),
        // the quick view's content / rendered content / space / with margin lines, for Show Size's element box
        focusPick: () => {
          const el = this.picker.focusEl;
          return { el, hue: el ? this.picker.picks.get(el)?.hue : null };
        },
        blocked: () => this.resize.blocked,
        record: (entry) => this.record(entry),
        state: (d) => this.state(d),
        queueLoad: () => this.queueLoad(),
        paint: () => this.paint()
      });
      this.loaded = false;
      this.ro = new ResizeObserver(() => this.paint());
      this.watched = /* @__PURE__ */ new Set();
      this.onMove = () => this.paint();
      for (const which of ["html", "css"]) this.lens.ui.btn(which).addEventListener("click", () => {
        if (this.lens.armed === which) {
          this.lens.arm(which, false);
          if (this.hasAttribute("open")) this.toggle(false);
        } else this.lens.arm(which);
      });
      this.closeBtn.addEventListener("click", () => this.toggle(false));
      this.scopeBtn.addEventListener("click", () => {
        let back = false;
        if (this.view === "css") {
          for (const k of ["limits", "cascade", "defaults", "overrides", "initials"]) if (this.cssView[k]) {
            this.cssView[k] = false;
            back = true;
          }
        }
        if (this.view === "html" && this.htmlView.around) {
          this.htmlView.around = null;
          this.htmlView.rows = /* @__PURE__ */ new Map();
          back = true;
        }
        if (this.mode[this.view] === "scope") {
          if (!back) return;
          this.syncMode();
          if (this.view === "css") this.cssView.render();
          else {
            this.htmlDirty = true;
            if (this.loaded) this.loadHtml();
          }
          return;
        }
        this.setMode(this.view, "scope");
      });
      this.allBtn.addEventListener("click", () => this.setMode(this.view, "all"));
      for (const [btn, key] of [[this.limitsBtn, "limits"], [this.cascadeBtn, "cascade"], [this.defaultsBtn, "defaults"], [this.renderBtn, "overrides"], [this.initialsBtn, "initials"]]) {
        btn.addEventListener("click", () => {
          const on = !this.cssView[key];
          for (const k of ["limits", "cascade", "defaults", "overrides", "initials"]) this.cssView[k] = k === key && on;
          this.syncMode();
          if (this.loaded) this.cssView.render();
        });
      }
      for (const [key, btn] of Object.entries(this.aroundBtns)) {
        btn.addEventListener("click", () => {
          this.htmlView.around = this.htmlView.around === key ? null : key;
          this.htmlView.rows = /* @__PURE__ */ new Map();
          this.syncMode();
          this.htmlDirty = true;
          if (this.hasAttribute("open") && this.view === "html" && this.loaded) this.loadHtml();
        });
      }
      this.resetBtn.addEventListener("click", () => this.resetAll());
      this.byeBtn.addEventListener("click", () => this.dismiss());
      this.pickBtn.addEventListener("click", () => this.setPicking(!this.picking));
      this.measureBtn.addEventListener("click", () => this.setMeasuring(!this.measuring));
      this.sizeBtn.addEventListener("click", () => this.setSizing(!this.sizing));
      this.head.title = "Drag to move";
      root.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && this.second) {
          e.preventDefault();
          this.closeSecond();
          return;
        }
        if (e.key === "Escape" && this.hasAttribute("open")) {
          e.preventDefault();
          this.toggle(false);
        }
      });
      this.onContextMenu = (e) => {
        const path = e.composedPath();
        if (path.includes(this) && !path.includes(this.pickSurface)) return;
        if (!this.tools.active && !this.measuring && !this.hasAttribute("open")) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        this.closeAll();
      };
      root.addEventListener("click", (e) => {
        if (this.dragged) {
          e.stopPropagation();
          e.preventDefault();
        }
      }, true);
      this.draggable(this.head);
      this.sheetDrag(this.head);
      this.foldable(this.head, this.panel);
      this.foldable(this.panel2.querySelector(".head"), this.panel2);
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
      addEventListener("contextmenu", this.onContextMenu, { capture: true, signal });
      addEventListener("scroll", this.onMove, { capture: true, passive: true, signal });
      globalThis.visualViewport?.addEventListener("resize", this.onResize, { signal });
      this.mo = new MutationObserver((records) => {
        if (records.some((r) => r.type === "childList" && ROOTS().includes(r.target))) markForeign();
        const ours = (n) => n === this.picker.cursorStyle || helper(n?.nodeType === 1 ? n : n?.parentElement);
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
        if (!this.loaded || !this.hasAttribute("open") && !this.pins.size && !this.picking && !this.sizing && !this.measuring && !this.lens.armed) return;
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
      this.picker.setPicking(false);
      this.resize.setSizing(false);
      this.setMeasuring(false);
      if (this.lens.armed) this.lens.arm(this.lens.armed, false);
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
      this.picker.prune(helper);
      this.resize.prune();
      if (this.lens.prune(helper)) {
        this.applyScope("html");
        this.applyScope("css");
      }
    }
    gesture(e, move, done, capture = true) {
      this.cancelGesture?.();
      const ctrl = new AbortController(), target = e.currentTarget, id = e.pointerId;
      let ended = false, grabbed = false;
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
        if (grabbed && event.target === target) end(event, true);
      }, options);
      const grab = () => {
        if (!ended) try {
          target.setPointerCapture(id);
          grabbed = true;
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
    foldable(head, panel) {
      head.addEventListener("click", (e) => {
        if (this.phone() || this.dragged || e.target.closest("button, input, a")) return;
        panel.toggleAttribute("data-folded");
        this.paint();
      });
    }
    avoidResizeHandle() {
      const el = this.resize.target;
      if (!el || this.phone()) return;
      const r = el.getBoundingClientRect(), p = this.panel.getBoundingClientRect();
      const half = this.handle.offsetWidth / 2 || 16;
      const x = Math.max(half, Math.min(r.right, innerWidth - half)), y = Math.max(half, Math.min(r.bottom, innerHeight - half));
      const resetW = this.hresetBtn.offsetWidth || 50, resetH = this.hresetBtn.offsetHeight || 20, gap = half + 6;
      const resetLeft = Math.max(4, x + gap + resetW > innerWidth - 4 ? x - gap - resetW : x + gap);
      const area = { left: Math.min(x - half, resetLeft), right: Math.max(x + half, resetLeft + resetW), top: y - Math.max(half, resetH / 2), bottom: y + Math.max(half, resetH / 2) };
      const overlaps = (left, top) => area.right > left && area.left < left + p.width && area.bottom > top && area.top < top + p.height;
      if (!overlaps(p.left, p.top)) return;
      const maxLeft = Math.max(8, this.rail.getBoundingClientRect().left - p.width - 8), maxTop = Math.max(8, innerHeight - p.height - 8);
      const spots = [[area.left - p.width - 8, p.top], [area.right + 8, p.top], [p.left, area.top - p.height - 8], [p.left, area.bottom + 8], [8, 8]].map(([left, top]) => [Math.max(8, Math.min(left, maxLeft)), Math.max(8, Math.min(top, maxTop))]).filter(([left, top]) => !overlaps(left, top)).sort((a, b) => Math.hypot(a[0] - p.left, a[1] - p.top) - Math.hypot(b[0] - p.left, b[1] - p.top));
      if (spots.length) this.moveTo(innerWidth - spots[0][0] - p.width, spots[0][1]);
    }
    phone() {
      return matchMedia("(max-width: 480px)").matches;
    }
    sheetDrag(handle) {
      handle.addEventListener("pointerdown", (e) => {
        if (e.button !== 0 || !this.phone() || e.target.closest("input, a")) return;
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
        if (e.button !== 0 || this.phone()) return;
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
      const minW = Math.min(240, innerWidth - 76), minH = Math.min(100, innerHeight - 16);
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
      w = Math.min(Math.max(w, Math.min(240, innerWidth - 76)), innerWidth - 76);
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
    dismiss() {
      this.resetAll();
      this.dispose();
      this.remove();
    }
    applyScope(which) {
      const el = this.mode[which] === "all" ? null : this.lens.scope[which];
      if (which === "html") {
        this.htmlView.scope = el;
        this.htmlDirty = true;
        if (this.hasAttribute("open") && this.view === "html" && this.loaded) this.loadHtml();
      } else {
        this.cssView.scope = el;
        if (this.loaded) this.cssView.render();
      }
      if (this.view === which) this.syncMode();
    }
    setMode(which, mode) {
      if (this.mode[which] === mode) return;
      this.mode[which] = mode;
      this.applyScope(which);
      this.paint();
    }
    syncMode() {
      const chosen = !!this.lens.scope[this.view], scope = this.mode[this.view] === "scope" && chosen;
      this.scopeBtn.hidden = this.allBtn.hidden = this.view === "quick" || this.view === "size";
      this.scopeBtn.disabled = !chosen;
      this.scopeBtn.setAttribute("aria-pressed", String(scope));
      this.allBtn.setAttribute("aria-pressed", String(!scope));
      for (const [btn, on] of [[this.limitsBtn, this.cssView.limits], [this.cascadeBtn, this.cssView.cascade], [this.defaultsBtn, this.cssView.defaults], [this.renderBtn, this.cssView.overrides], [this.initialsBtn, this.cssView.initials]]) {
        btn.hidden = this.view !== "css";
        btn.disabled = !scope;
        btn.setAttribute("aria-pressed", String(on));
      }
      for (const [key, btn] of Object.entries(this.aroundBtns)) {
        btn.hidden = this.view !== "html";
        btn.disabled = !scope;
        btn.setAttribute("aria-pressed", String(this.htmlView.around === key));
      }
    }
    openView(which, keep = false) {
      if (this.hasAttribute("open") && this.view === which) {
        if (!keep) this.toggle(false);
        return;
      }
      this.show(which);
      if (!this.hasAttribute("open")) this.toggle(true);
    }
    toggle(open) {
      if (!open && this.editor && !this.editor.finish(false)) this.editor.finish(true);
      if (!open && this.second) this.closeSecond(false);
      this.anchor();
      this.toggleAttribute("open", open);
      if (!open) this.panel.removeAttribute("data-folded");
      this.fit();
      this.show(this.view || "html");
      if (open) {
        this.load();
        this.panel.focus();
      } else {
        this.panel.style.removeProperty("--sheet");
        if (this.panel.contains(this.shadowRoot.activeElement)) (this.view === "css" ? this.cssBtn : this.view === "quick" ? this.pickBtn : this.view === "size" ? this.sizeBtn : this.htmlBtn).focus();
      }
      this.paint();
    }
    show(which) {
      if (which === "css" && this.second) this.closeSecond(false);
      this.view = which;
      const open = this.hasAttribute("open");
      this.htmlBtn.setAttribute("aria-expanded", String(open && which === "html"));
      this.cssBtn.setAttribute("aria-expanded", String(open && which === "css"));
      for (const [k, v] of Object.entries(this.views)) v.hidden = which !== k;
      if (which === "html" && this.htmlDirty && this.loaded) this.loadHtml();
      this.syncMode();
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
          if (this.view === "quick") this.renderQuick(this.quickEl, true);
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
    /* ---------- the HTML tab lives in panel/html-view.js, the picker in tools/picker.js; this is the surface the panel and the drivers reach them by ---------- */
    get rows() {
      return this.htmlView.rows;
    }
    loadHtml() {
      this.htmlView.load();
      this.htmlDirty = false;
    }
    get picks() {
      return this.picker.picks;
    }
    get focusEl() {
      return this.picker.focusEl;
    }
    get probe() {
      return this.picker.probe;
    }
    get alt() {
      return this.picker.alt;
    }
    get picking() {
      return this.picker.picking;
    }
    setPicking(on) {
      this.picker.setPicking(on);
    }
    select(el) {
      this.picker.select(el);
    }
    pick(el, row) {
      this.picker.pick(el, row);
    }
    clearPicks() {
      this.picker.clear();
    }
    /* ---------- the resize tool lives in tools/resize.js; this is the surface the panel and the drivers reach it by ---------- */
    get sizing() {
      return this.resize.sizing;
    }
    get sizeTarget() {
      return this.resize.target;
    }
    get sized() {
      return this.resize.sized;
    }
    get sizeDrag() {
      return this.resize.drag;
    }
    get blocked() {
      return this.resize.blocked;
    }
    setSizing(on) {
      this.resize.setSizing(on);
    }
    chooseSize(el) {
      this.resize.choose(el);
    }
    resizeStart(el) {
      return this.resize.start(el);
    }
    resizeWidth(session, desired) {
      this.resize.width(session, desired);
    }
    finishResize(session, cancelled) {
      this.resize.finish(session, cancelled);
    }
    sizeReset(el, record) {
      this.resize.reset(el, record);
    }
    sizeUndo() {
      this.resize.undo();
    }
    sizeResetAll() {
      this.resize.resetAll();
    }
    setBlocked(d, text, area) {
      this.resize.setBlocked(d, text, area);
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
    /* ---------- the overlay ---------- */
    marks() {
      const list = [...this.picks].map(([el, p]) => ({ el, model: true, hue: p.hue }));
      if (this.probe && !this.picks.has(this.probe)) {
        if (this.alt && this.focusEl) list.push({ el: this.probe, dist: true });
        else list.push({ el: this.probe, probe: true, bands: this.picking });
      }
      if (this.resize.sizing && this.resize.target) list.push({ el: this.resize.target, size: true });
      const scope = this.hasAttribute("open") ? this.view === "quick" ? this.quickEl : this.view === "size" ? null : this.lens.scope[this.view] : null;
      if (scope?.isConnected && !this.picks.has(scope) && scope !== this.probe) list.push({ el: scope, probe: true, bands: this.view === "quick" });
      if (this.resize.sizing && this.resize.heldArea?.isConnected && this.wblock.textContent) list.push({ el: this.resize.heldArea, hold: true });
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
        const i = list.findIndex((m) => m.measure && m.el === this.rulerProbe);
        if (i >= 0) list.push(...list.splice(i, 1));
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
      let candidates2 = [];
      if (model.inlineEl) candidates2 = [model.inlineEl];
      else if (model.selector) {
        const nativeSelectors = model.scoped || model.wraps.some((h) => !h.startsWith("@"));
        if (nativeSelectors) candidates2 = [...document.querySelectorAll("*")];
        else try {
          candidates2 = [...document.querySelectorAll(model.selector)];
        } catch {
          candidates2 = [];
        }
      }
      const result = this.store.matchModel(model, candidates2.filter(rendered));
      this.reachCache?.set(model, result);
      return result;
    }
    paint() {
      if (!this.connected || this.paintFrame != null) return;
      this.paintFrame = requestAnimationFrame(() => {
        this.paintFrame = null;
        if (this.htmlDirty && this.loaded && this.hasAttribute("open") && !this.views.html.hidden && !this.editor && !this.resize.drag) this.loadHtml();
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
      const chrome = [this.rail.getBoundingClientRect(), ...this.hasAttribute("open") ? [this.panel.getBoundingClientRect()] : [], ...this.second ? [this.panel2.getBoundingClientRect()] : []];
      for (const m of marks) {
        this.painter.group(m.probe ? "pick probe" : m.decl ? "pick decl" : m.measure ? "pick ruler" : "pick", m.model ? `var(--pick-${m.hue % PALETTE})` : m.decl ? "var(--css)" : null);
        if (m.model) paintModel(this.painter, m.el, m.hue, chrome, this.focusEl);
        else if (m.probe) paintProbe(this.painter, m.el, chrome, m.bands);
        else if (m.dist) paintDistance(this.painter, this.focusEl, m.el, chrome);
        else if (m.measure) paintMeasure(this.painter, m.el, chrome);
        else if (m.size) this.resize.paintSizer(m.el, chrome);
        else if (m.hold) this.resize.paintHold(m.el, chrome);
        else paintDecl(this.painter, m.el, m.decl, chrome);
      }
      this.painter.end();
      this.reachCache = null;
    }
    setMeasuring(on) {
      if (on === this.measuring) return;
      this.measuring = on;
      if (on) {
        this.solo("measuring");
        this.rulerRuntime = new AbortController();
        addEventListener("pointermove", (e) => {
          const el = e.composedPath().includes(this) ? null : document.elementsFromPoint(e.clientX, e.clientY).find((n) => !helper(n)) || null;
          if (el !== this.rulerProbe) {
            this.rulerProbe = el;
            this.paint();
          }
        }, { passive: true, signal: this.rulerRuntime.signal });
        addEventListener("click", (e) => {
          const path = e.composedPath();
          if (this.dragged || path.includes(this.measureBtn) || path.includes(this.pickBtn) || path.includes(this.sizeBtn)) return;
          if (this.tools.active && (!path.includes(this) || path.includes(this.pickSurface))) return;
          this.setMeasuring(false);
        }, { capture: true, signal: this.rulerRuntime.signal });
      } else {
        this.rulerRuntime?.abort();
        this.rulerProbe = null;
      }
      this.measureBtn.setAttribute("aria-pressed", String(on));
      this.toggleAttribute("measuring", on);
      this.paint();
    }
    /* ---------- the CSS tab lives in panel/css-view.js; this is the surface the panel and the drivers reach it by ---------- */
    get rowOf() {
      return this.cssView.rowOf;
    }
    get pins() {
      return this.cssView.pins;
    }
    get hover() {
      return this.cssView.hover;
    }
    get editor() {
      return this.cssView.editor;
    }
    renderCss() {
      this.cssView.render();
    }
    markHits() {
      this.cssView.markHits();
    }
    scrollToHit() {
      this.cssView.scrollToHit();
    }
    syncRow(d) {
      this.cssView.syncRow(d);
    }
    apply(d) {
      this.cssView.apply(d);
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
    openSecond(el, d = null) {
      this.lens.scope.css = el;
      this.mode.css = "scope";
      this.applyScope("css");
      this.p2title.textContent = `CSS · ${name(el)}`;
      this.p2body.append(this.views.css);
      this.views.css.hidden = false;
      this.panel2.hidden = false;
      this.panel2.removeAttribute("data-folded");
      this.second = true;
      const r = this.getBoundingClientRect(), w = this.panel2.offsetWidth;
      this.placeSecond(r.left - w - 12 >= 8 ? r.left - w - 12 : r.right + 12, r.top);
      const row = d && this.rowOf.get(d)?.row;
      if (row) row.scrollIntoView({ block: "center" });
      this.panel2.focus();
      this.paint();
    }
    placeSecond(left, top) {
      if (this.phone()) {
        this.panel2.style.left = "0";
        this.panel2.style.top = "8px";
        return;
      }
      const w = this.panel2.offsetWidth, h = this.panel2.offsetHeight;
      this.panel2.style.left = `${Math.min(Math.max(left, 8), Math.max(innerWidth - w - 8, 8))}px`;
      this.panel2.style.top = `${Math.min(Math.max(top, 8), Math.max(innerHeight - h - 8, 8))}px`;
      this.paint();
    }
    closeSecond(refocus = true) {
      if (!this.second) return;
      if (this.editor && !this.editor.finish(false)) this.editor.finish(true);
      this.body.append(this.views.css);
      this.views.css.hidden = this.view !== "css";
      this.panel2.hidden = true;
      this.second = false;
      if (refocus) (this.wblock.querySelector(".wgo") || this.panel).focus();
      this.paint();
    }
    solo(id) {
      if (id !== "picking") this.picker.setPicking(false);
      if (id !== "sizing") this.resize.setSizing(false);
      for (const which of ["html", "css"]) if (which !== id && this.lens.armed === which) this.lens.arm(which, false);
      if (id !== "measuring") this.setMeasuring(false);
      if (this.hasAttribute("open")) this.toggle(false);
    }
    renderQuick(el, force = false) {
      const view = this.views.quick;
      if (!el) {
        if (!this.quickKey) view.replaceChildren(this.htmlView.note("Click an element on the page."));
        return;
      }
      const r = el.getBoundingClientRect();
      const key = `${name(el)} ${fmt(r.width)} × ${fmt(r.height)}`;
      if (key === this.quickKey && !force) return;
      this.quickKey = key;
      const [entry] = sizeLadder(this.store, el);
      const head = document.createElement("div");
      head.className = "qname";
      head.append(span("re", name(el)), ` ${fmt(r.width)} × ${fmt(r.height)}px`);
      view.replaceChildren(head, this.boxModel(el), ...entry ? sizeRows(entry, false) : [], ...this.contentRows(el));
    }
    contentRows(el) {
      const { r, p, m, b } = this.painter.geometry(el);
      const pad = { w: p.l + p.r, h: p.t + p.b }, bor = { w: b.l + b.r, h: b.t + b.b }, mar = { w: m.l + m.r, h: m.t + m.b };
      const wh = (o) => `${fmt(o.w)} × ${fmt(o.h)}px`;
      const line = (word, size, ...why) => {
        const n = document.createElement("div");
        n.className = "lim";
        n.append(span("rp", word), " ", span("rv", wh(size)), ": ", ...why);
        return n;
      };
      const parts = [];
      if (pad.w || pad.h) parts.push(span("rp", "padding"), " ", span("rv", wh(pad)));
      if (bor.w || bor.h) parts.push(...parts.length ? [", "] : [], span("rp", "border"), " ", span("rv", wh(bor)));
      return [
        line("content", { w: r.width - pad.w - bor.w, h: r.height - pad.h - bor.h }, "the box inside the padding"),
        ...this.textRow(el, line),
        // what the content actually covers, right under the content box
        line("space", { w: pad.w + bor.w, h: pad.h + bor.h }, ...parts.length ? parts : ["none, the content fills the element"]),
        line("with margin", { w: r.width + mar.w, h: r.height + mar.h }, ...mar.w || mar.h ? [span("rp", "margin"), " ", span("rv", wh(mar)), ", the room it takes in the layout"] : ["no margin, the element alone"])
      ];
    }
    textRow(el, line) {
      if (el instanceof SVGElement || /^(img|video|audio|canvas|iframe|input|textarea|select)$/.test(el.localName) || !el.childNodes.length) return [];
      const range = document.createRange();
      range.selectNodeContents(el);
      const box = range.getBoundingClientRect(), rects = [...range.getClientRects()].filter((q) => q.width > 0 && q.height > 0);
      if (!box.width || !box.height) return [];
      const inline = [...el.children].every((c) => /^inline/.test(getComputedStyle(c).display));
      const tops = [...new Set(rects.map((q) => Math.round(q.top)))].length || 1;
      const { r, p, b } = this.painter.geometry(el), free = r.width - p.l - p.r - b.l - b.r - box.width;
      const what = inline && el.textContent.trim() ? `${tops} line${tops === 1 ? "" : "s"}, ${getComputedStyle(el).textAlign.replace(/^(start|left)$/, "start-aligned").replace(/^(end|right)$/, "end-aligned").replace(/^center$/, "centered").replace(/^justify$/, "justified")}` : "the children's boxes together";
      return [line("rendered content", { w: box.width, h: box.height }, what, ...free > 0.5 ? [", ", span("rv", fmt(free) + "px"), " free beside it"] : [])];
    }
    boxModel(el) {
      const { r, p, m, b } = this.painter.geometry(el);
      const inner = { w: r.width - p.l - p.r - b.l - b.r, h: r.height - p.t - p.b - b.t - b.b };
      const layer = (cls, label, sides2, child) => {
        const n = document.createElement("div");
        n.className = `bm-layer ${cls}`;
        const v = (x) => x ? fmt(x) : "–";
        n.append(span("bm-label", label), span("bm-t", v(sides2.t)), span("bm-l", v(sides2.l)), child, span("bm-r", v(sides2.r)), span("bm-b", v(sides2.b)));
        return n;
      };
      const content = document.createElement("div");
      content.className = "bm-content";
      content.textContent = `${fmt(inner.w)} × ${fmt(inner.h)}`;
      const box = document.createElement("div");
      box.className = "bm";
      box.append(layer("bm-margin", "margin", m, layer("bm-border", "border", b, layer("bm-padding", "padding", p, content))));
      return box;
    }
    closeAll() {
      if (this.editor) this.editor.finish(true, true);
      this.picker.setPicking(false);
      this.resize.setSizing(false);
      this.setMeasuring(false);
      if (this.lens.armed) this.lens.arm(this.lens.armed, false);
      if (this.hasAttribute("open")) this.toggle(false);
    }
    resetAll() {
      this.closeAll();
      this.lens.scope = { html: null, css: null };
      for (const which of ["html", "css"]) {
        this.mode[which] = "scope";
        this.applyScope(which);
      }
      this.resize.resetAll();
      this.reset();
      this.clearMarks();
    }
    clearMarks() {
      this.picker.clear();
      this.cssView.clearMarks();
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
        }
        this.store.settleChains(model);
        for (const d of model.decls) if (d.type === "decl") this.syncRow(d);
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
