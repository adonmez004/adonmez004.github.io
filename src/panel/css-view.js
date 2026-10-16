// The CSS tab: every stylesheet as rule groups and declaration rows (tick, pin, value edit), the last pick's matching rules lit in its hue, the
// inline style="" groups placed above their element's first rule. It reaches the panel through `ui` alone: view (the tab's element), body (the
// scroll box), store, status (the status line), focusPick() -> { el, hue } (the last pick), blocked() (the row the resize tool holds red),
// record(entry), state(d), queueLoad(), paint()
import { PALETTE, isColor, span, name, sizeRows } from "../util.js";
import { defaultDecls } from "../css/defaults.js";
import { sizeLadder, rulesOf } from "../tools/size-explain.js";

// The properties a child inherits (CSS's inherited: yes), plus every custom property
const INHERITED = /^(--|color$|cursor$|direction$|font|letter-spacing$|line-height$|list-style|quotes$|tab-size$|text-align|text-indent$|text-transform$|text-shadow$|text-rendering$|visibility$|white-space|word-spacing$|word-break$|overflow-wrap$|hyphens$|writing-mode$|caption-side$|border-collapse$|border-spacing$|empty-cells$|orphans$|widows$|caret-color$|accent-color$|color-scheme$|image-rendering$|pointer-events$|text-decoration-skip|text-underline|-webkit-text-size-adjust$|-webkit-font-smoothing$)/;

// The sources a computed value can come from, in the stack's link order, with the word each link wears and the line a narrowed stack opens with
const SOURCES = ["author", "browser", "inherited", "os", "layout", "currentcolor", "initial"];
const SOURCE_NAMES = { author: "Author", browser: "Browser", inherited: "Inherited", os: "OS", layout: "Layout", currentcolor: "Currentcolor", initial: "Initial" };
const SOURCE_NOTES = {
  author: "Values the page's own stylesheets set on this element, its rules and inline style. They win over the browser's defaults.",
  browser: "Values from the browser's default stylesheet for this tag, as this tool's table of the defaults knows them. A struck row is one an author rule overrides.",
  inherited: "Values an ancestor's rule set and this element inherits, like the text colour and the font. Nothing on the element itself sets them.",
  os: "Values CSS leaves to the platform: the default font and size, the text colour, the accent. The browser reads them from the OS and user settings.",
  layout: "Values no rule sets. The layout works them out from the box and its content: auto sizes, origins and grid tracks, in pixels.",
  currentcolor: (color) => `Colour properties with no colour of their own. They follow the element's color, ${color} here, so a change to color changes them too.`,
  initial: "Properties still at the initial value CSS defines for every element. Nothing on the page changes them.",
};
// The property names a stylesheet can set a computed property by: itself, its logical/physical twin (the element's writing mode and direction), and the real shorthands over it
const SHORTHANDS = [
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
  [/^(min-|max-)?(inline|block)-size$/, () => []],
];
// The properties whose initial value is not CSS's but the platform's: the user agent and the OS settings behind it (the default font and its size, the text colour, the accent)
const OS_PROPS = new Set(["font-family", "font-size", "line-height", "color", "accent-color", "caret-color", "color-scheme", "scrollbar-color", "scrollbar-width", "text-rendering", "forced-color-adjust"]);
export function candidates(prop, style = {}) {
  const mode = style.writingMode || "horizontal-tb", rtl = style.direction === "rtl";
  const vertical = /^(vertical|sideways)/.test(mode), lr = /-lr$/.test(mode);
  const inlineReverse = rtl !== (mode === "sideways-lr");
  const sideTwin = vertical
    ? { [lr ? "left" : "right"]: "block-start", [lr ? "right" : "left"]: "block-end", [inlineReverse ? "bottom" : "top"]: "inline-start", [inlineReverse ? "top" : "bottom"]: "inline-end", width: "block-size", height: "inline-size" }
    : { top: "block-start", bottom: "block-end", [rtl ? "right" : "left"]: "inline-start", [rtl ? "left" : "right"]: "inline-end", width: "inline-size", height: "block-size" };
  const out = new Set([prop]), physical = (lg) => Object.keys(sideTwin).find((k) => sideTwin[k] === lg);
  if (/^(top|bottom|left|right)$/.test(prop)) out.add(`inset-${sideTwin[prop]}`);
  const ins = /^inset-(block|inline)-(start|end)$/.exec(prop); if (ins) out.add(physical(`${ins[1]}-${ins[2]}`));
  const corner = /^border-(top|bottom)-(left|right)-radius$/.exec(prop), lcorner = /^border-(start|end)-(start|end)-radius$/.exec(prop);
  if (corner) { const sides = [sideTwin[corner[1]], sideTwin[corner[2]]]; out.add(`border-${sides.find((s) => s.startsWith("block-")).slice(6)}-${sides.find((s) => s.startsWith("inline-")).slice(7)}-radius`); } // a corner is its block side and its inline side
  else if (lcorner) { const sides = [physical(`block-${lcorner[1]}`), physical(`inline-${lcorner[2]}`)]; out.add(`border-${sides.find((s) => /^(top|bottom)$/.test(s))}-${sides.find((s) => /^(left|right)$/.test(s))}-radius`); }
  else for (const [ph, lg] of Object.entries(sideTwin)) {
    if (prop === ph) out.add(lg); else if (prop === lg) out.add(ph);
    else if (/^(width|height)$/.test(ph)) { for (const pre of ["min-", "max-", "contain-intrinsic-"]) { if (prop === `${pre}${ph}`) out.add(`${pre}${lg}`); else if (prop === `${pre}${lg}`) out.add(`${pre}${ph}`); } } // the size twins: the size families alone (min, max, contain-intrinsic), a border-width is no inline-size
    else if (prop.includes(`-${ph}`)) out.add(prop.replace(`-${ph}`, `-${lg}`)); else if (prop.includes(`-${lg}`)) out.add(prop.replace(`-${lg}`, `-${ph}`));
  }
  for (const base of [...out]) for (const [re, expand] of SHORTHANDS) { const m = re.exec(base); if (m) for (const sh of expand(m)) out.add(sh); }
  if (prop !== "direction" && prop !== "unicode-bidi" && !prop.startsWith("--")) out.add("all");
  return [...out];
}

export class CssView {
  constructor(ui) {
    this.ui = ui;
    this.rowOf = new Map(); // declaration -> its rendered row parts, for the current view
    this.openWhy = null; // the one open explanation under a source note
    ui.view.addEventListener("click", (e) => { if (!e.composedPath().some((n) => n.classList?.contains("why"))) this.closeWhy(); }); // a click anywhere else closes it
    this.groups = []; // { node, el }: each rendered rule and its group box
    this.pins = new Set(); // pinned declarations: their reach painted on the page
    this.hover = null; // the declaration under the pointer
    this.editor = null; // the open value edit: { field, finish, declaration }
    this.pendingRender = false; // a rebuild that arrived while a value was being edited waits for the edit to end
    this.scope = null; // the lens's chosen element: the view shows the rules that reach it alone; null = every stylesheet
    this.defaults = false; // under a scope: the browser's own default rules for the element, read-only, under the author's
    this.cascade = false; // under a scope: what the element inherits, the ancestors' rules with their inheritable lines, nearest ancestor first
    this.limits = false; // under a scope: the size ladder (the element's width and height and what sets each, then each parent's, up to the body), above its own rules
    this.initials = false; // under a scope: every property as a cascade stack, read-only, a block of its own above the own rules
    this.overrides = false; // under a scope (Show Computed): the properties where the author's rules override a browser default, both rows, no initial, the browser's and the author's values over the initial
    this.source = null; // the stack narrowed to one source (a click on a source link under the head): author | browser | inherited | os | layout | currentcolor | initial; null = every row
    this.sizePick = null; this.sizeScope = null; // Show Size narrowed to one box of the ladder (an index) and the scope it belongs to; null = the whole ladder
    this.sourceKey = ""; this.sourceScope = null; // the block and scope the narrowing belongs to: a new scope or block widens the stack again
  }

  limit(text) {
    const n = document.createElement("div");
    n.className = "lim";
    n.textContent = text;
    return n;
  }

  rules(nodes, out = []) {
    // Every rule node in a sheet's tree, in source order (the groups' children included)
    for (const n of nodes) { if (n.type === "rule") out.push(n); if (n.children) this.rules(n.children, out); }
    return out;
  }

  shows(n) {
    // Under a scope a rule renders when it reaches the chosen element; the sheets' comments and the unpaired text stay out
    if (!this.scope) return true;
    if (n.type !== "rule") return false;
    return !!n.model && this.ui.store.matchModel(n.model, [this.scope]).length > 0;
  }

  onBuilt() {
    // The store built (or rebuilt) its models: the view follows, unless a value edit is open
    if (!this.editor) this.render(); else this.pendingRender = true;
  }

  dropped(d) { if (this.hover === d) this.hover = null; } // the store dropped a declaration the page removed

  clearMarks() {
    // Every pin off the page and out of the rows; the edits stay
    this.pins.clear();
    this.hover = null;
    this.markHits();
    for (const r of this.rowOf.values()) { r.row.classList.remove("on"); r.row.querySelector(".t")?.setAttribute("aria-pressed", "false"); }
  }

  render() {
    // Every stylesheet, every rule, in source order; the last pick's matching rules are then lit in place
    const { view, store } = this.ui;
    const active = view.getRootNode().activeElement, held = active && view.contains(active) ? [...this.rowOf].find(([, r]) => r.row.contains(active))?.[0] : null; // the declaration whose row holds the focus: it keeps it on the new rows
    const link = active && view.contains(active) && active.classList.contains("srcb") ? active.textContent : null; // a source or size link with the focus keeps it on its new self, or on All once it is gone
    view.replaceChildren();
    this.hover = null; // the hovered row is gone with the old view
    this.rowOf = new Map();
    this.groups = [];
    if (held) queueMicrotask(() => { const r = this.rowOf.get(held); if (r && view.contains(r.row)) r.value.focus(); }); // after the rows are back
    else if (link) queueMicrotask(() => { const links = [...view.querySelectorAll(".srcs .srcb")]; (links.find((b) => b.textContent === link) || links[0])?.focus(); });
    if (!store.sheets.length && !store.inlineNodes?.length) { view.append(this.note("No stylesheet on this page.")); return; }
    const scope = this.scope?.isConnected ? this.scope : null;
    this.scope = scope;
    // Under a scope the list is the element's own rules, or ONE of the blocks in their place: the browser's defaults, what the ancestors pass down (the farthest first), the width's ladder, the initial values
    const allRules = () => store.sheets.filter((s) => !s.unread).flatMap((s) => this.rules(s.nodes));
    const ownModels = new Set(scope ? allRules().filter((n) => n.model && store.matchModel(n.model, [scope]).length > 0).map((n) => n.model) : []);
    if (scope && this.defaults) {
      // the browser's defaults for the element's tag: no sheet carries them, the rows are read-only
      const decls = defaultDecls(scope.localName);
      view.append(this.comment("/* browser defaults */"));
      view.append(this.note("The defaults as this tool's table knows them. The browser's own sheet adds rules by attribute and state (an input's type, a disabled control), and browsers differ."));
      if (decls.length) view.append(this.group({ type: "rule", head: scope.localName, decls, model: null }, { depth: 0 }));
      else view.append(this.note(`No default rule for ${name(scope)} beyond display: inline.`));
    }
    if (scope && this.cascade) {
      // the cascade: each ancestor's rules, their inheritable lines alone, the farthest ancestor first; a rule that reaches the element itself shows there instead
      const seen = new Set(ownModels);
      const ancestors = []; for (let a = scope.parentElement; a; a = a.parentElement) ancestors.unshift(a);
      let any = false;
      for (const a of ancestors) {
        const nodes = [...allRules(), ...(store.inlineNodes || []).filter((n) => n.model.inlineEl === a)]
          .filter((n) => n.model && !seen.has(n.model) && (n.model.inlineEl ? n.model.inlineEl === a : store.matchModel(n.model, [a]).length > 0))
          .map((n) => ({ ...n, decls: n.decls.filter((d) => d.type !== "decl" || INHERITED.test(d.prop)) }))
          .filter((n) => n.decls.some((d) => d.type === "decl"));
        if (!nodes.length) continue;
        any = true;
        view.append(this.comment(`/* inherited from ${name(a)} */`));
        for (const n of nodes) { seen.add(n.model); const g = this.group(n, { depth: 0 }); if (n.model.inlineEl) g.classList.add("inline"); view.append(g); }
      }
      if (!any) view.append(this.note("Nothing inherited from the ancestors' rules."));
    }
    if (scope && this.limits) {
      // the size ladder: the element's width and height and what sets each, then the same for each parent up to the body
      // Under the links one box per link: All (the whole ladder), Element, Parent, Grandparent, …, Body, Viewport; a click shows that box alone, All lit at rest
      const kin = (i) => (i === 1 ? "parent" : i === 2 ? "grandparent" : i === 3 ? "great-grandparent" : `ancestor ${i}`);
      const ladder = sizeLadder(store, scope);
      if (ladder.length) ladder.push({ el: null, name: "viewport", w: innerWidth, h: innerHeight, width: ["the browser window"], height: ["the browser window"] }); // the box every ladder ends in
      const label = (entry, i) => (entry.el === null ? "Viewport" : i === 0 ? "Element" : entry.el === document.body ? "Body" : kin(i).replace(/^./, (c) => c.toUpperCase()));
      if (scope !== this.sizeScope || this.sizePick >= ladder.length) this.sizePick = null; this.sizeScope = scope; // a new scope widens the ladder
      if (ladder.length > 1) {
        const links = document.createElement("div"); links.className = "srcs";
        [["All", null], ...ladder.map((entry, i) => [label(entry, i), i])].forEach(([word, i]) => {
          const b = document.createElement("button"); b.type = "button"; b.className = "srcb"; b.textContent = word; b.setAttribute("aria-pressed", String(this.sizePick === i));
          b.addEventListener("click", (e) => { e.stopPropagation(); this.sizePick = i === null || this.sizePick === i ? null : i; this.render(); });
          links.append(b);
        });
        view.append(links);
      }
      ladder.forEach((entry, i) => {
        const extra = i === 0 ? this.ui.sizeExtra(entry.el) : []; // the element's box itself gets the quick view's lines: content, rendered content, space, with margin
        if (this.sizePick !== null) { if (i === this.sizePick) view.append(...sizeRows(entry, true, i && entry.el ? kin(i) : ""), ...extra); return; }
        if (i === 1) { // the parents, under a rule, with a head and a line on what they are
          view.append(Object.assign(document.createElement("hr"), { className: "lsep" }));
          const head = document.createElement("div"); head.className = "lim lhead"; head.textContent = "up the tree"; view.append(head);
          view.append(this.note("The boxes around the element, up to the viewport."));
        }
        view.append(...sizeRows(entry, true, i && entry.el ? kin(i) : ""), ...extra);
      });
    }
    if (scope && (this.initials || this.overrides)) {
      // every standard property as a STACK (Show Initials), or the overridden ones alone (Show Render: the properties the browser's defaults or the author's rules set over the initial)
      const all = this.cascade_(scope), clashes = new Set(all.filter((r) => r.over && r.src === "browser").map((r) => r.prop)); // the properties the author set over a browser default
      const rows = this.overrides ? all.filter((r) => clashes.has(r.prop) && r.src !== "initial" && r.src !== "os") : all; // Show Computed: the browser's default struck under the author's value, the initial left out
      view.append(this.comment(this.overrides ? "/* computed: the author's values over the browser's defaults */" : "/* every property, with what sets it and what it overrides */"));
      const key = this.overrides ? "o" : "i"; if (key !== this.sourceKey || scope !== this.sourceScope || !rows.some((r) => r.src === this.source)) this.source = null; this.sourceKey = key; this.sourceScope = scope; // a new scope or block widens the stack
      view.append(this.stackGroup(rows));
    }
    if (scope && (this.limits || this.cascade || this.defaults || this.initials || this.overrides)) { this.markHits(); return; } // a block shows alone: the element's own rules wait for the button's second press
    const ownStart = document.createComment("own"); view.append(ownStart); // the element's own section starts here: its inline style="" lands right after it when no rule leads
    const before = this.groups.length;
    for (const s of store.sheets) {
      if (store.sheets.length > 1 && !scope) view.append(this.comment(`/* ${s.name} */`));
      if (s.unread) { if (!scope) view.append(this.comment("/* stylesheet could not be read */")); continue; }
      this.renderNodes(view, s.nodes, 0);
    }
    if (scope && this.groups.length === before && !(store.inlineNodes || []).some((n) => n.model.inlineEl === scope)) view.append(this.note("No rule reaches this element."));
    // An element's inline style="" sits right above the first rule that selects it, in its own colour; with no such rule it leads its section
    for (const n of store.inlineNodes || []) {
      const el = n.model.inlineEl;
      if (scope && el !== scope) continue;
      const matches = this.groups.slice(before).filter((x) => x.node !== n && x.node.model && !x.node.model.inlineEl && store.matchModel(x.node.model, [el]).length > 0);
      const first = matches.find((x) => !/^\*/.test(x.node.model.selector || "")) || matches[0]; // past the universal resets, like scrollToHit
      const g = this.group(n, { depth: 0 });
      g.classList.add("inline");
      if (first) first.el.before(g); else ownStart.after(g);
    }
    this.markHits();
  }

  markHits() {
    // The groups whose rule selects the last pick wear its hue; the others stand as they are
    const { el, hue } = this.ui.focusPick();
    for (const { node, el: g } of this.groups) {
      let hit = false;
      if (el && node.model) hit = this.ui.store.matchModel(node.model, [el]).length > 0;
      g.classList.toggle("hit", hit);
      if (hit) g.style.setProperty("--accent", `var(--pick-${hue % PALETTE})`); else g.style.removeProperty("--accent");
    }
  }

  scrollToHit() {
    // Brings the pick's own rule into view: the first lit group past the universal resets, else the first lit one
    const hits = this.groups.filter((x) => x.el.classList.contains("hit"));
    const first = (hits.find((x) => !/^\*/.test(x.node.model.selector || "")) || hits[0])?.el;
    if (!first) return;
    const body = this.ui.body.getBoundingClientRect();
    this.ui.body.scrollTop += first.getBoundingClientRect().top - body.top - 8;
  }

  cascade_(scope) {
    // Every standard property with its computed value and where that value comes from: the author's rules on the element, the browser's defaults, an ancestor
    // it inherits from, the layout's arithmetic, or the initial value (read off a probe with `all: initial` in a hidden box). Rows per property as a STACK:
    // the initial value, then what overrides it, the winner last; the overridden rows marked `over`
    const store = this.ui.store;
    const hidden = document.createElement("div"); hidden.setAttribute("data-fm-inspector-ignore", ""); hidden.style.display = "none";
    const probe = document.createElement("div"); probe.style.cssText = "all: initial; direction: ltr; unicode-bidi: normal;"; hidden.append(probe); // `all` skips direction and unicode-bidi, so the two get their spec initials by hand
    document.body.append(hidden);
    const pcs = getComputedStyle(probe), ecs = getComputedStyle(scope);
    // the declarations that reach the element, the last one per property winning: the author's (its rules and inline style) and the browser's defaults
    const declsOf = (models) => { const map = new Map(); for (const m of models) for (const d of m.decls) if (d.type === "decl" && d.on && d.live !== false) map.set(d.prop, d); return map; };
    const author = declsOf(rulesOf(store, scope)), browser = new Map(defaultDecls(scope.localName).map((d) => [d.prop, d]));
    const chain = []; for (let a = scope.parentElement; a; a = a.parentElement) chain.push({ a, decls: declsOf(rulesOf(store, a)) });
    const hit = (map, prop) => { for (const c of candidates(prop, ecs)) if (map.has(c)) return map.get(c); return null; };
    const initialRow = (prop) => (OS_PROPS.has(prop) ? { src: "os", note: "initial, set by the OS", why: "No fixed initial in CSS. The browser takes it from the OS and user settings." } : { src: "initial", note: "initial" }); // a platform default wears its own colour
    const via = (who, d, prop) => `set by the ${who}${d.prop === prop ? "" : ` via ${d.prop}`}`;
    const rows = [];
    for (const prop of [...pcs].filter((p) => !p.startsWith("-")).sort()) { // the standard properties: no vendor-prefixed internals, no custom properties
      const value = ecs.getPropertyValue(prop), initial = pcs.getPropertyValue(prop);
      const a = hit(author, prop), b = hit(browser, prop);
      let winner;
      if (a) winner = { value, src: "author", note: via("author", a, prop) };
      else if (b) winner = { value, src: "browser", note: via("browser", b, prop), why: `No author rule. It comes from the browser's default stylesheet for <${scope.localName}>.` };
      else if (value !== initial && INHERITED.test(prop)) { const from = chain.find((c) => hit(c.decls, prop)); winner = { value, src: "inherited", note: from ? `inherited from ${name(from.a)}` : "inherited" }; }
      else if (value !== initial && /-color$/.test(prop) && value === ecs.color) { // a border or outline colour with no rule of its own: one row, the keyword with the colour it takes in the note, not struck
        rows.push({ prop, value: "currentcolor", src: "currentcolor", note: `from color: ${value}`, why: `No colour of its own: currentcolor takes the element's color, ${value} here.` });
        continue;
      }
      else if (value !== initial) winner = { value, src: "layout", note: "resolved by the layout", why: "No rule sets it. The layout worked the value out from the box, in pixels." }; // an auto width in px, a transform origin at the box's centre
      else winner = { value: initial, ...initialRow(prop) };
      if (winner.src !== "initial" && winner.src !== "os") rows.push({ prop, value: initial, ...initialRow(prop), over: true }); // the initial it overrides
      if (b && winner.src === "author" && b.value !== initial) rows.push({ prop, value: b.value, src: "browser", note: via("browser", b, prop), over: true }); // a default equal to the initial overrides nothing
      rows.push({ prop, ...winner });
    }
    hidden.remove();
    return rows;
  }

  stackGroup(all) {
    // The stack's rows as one read-only group: each row coloured by its source, an overridden row struck through, the winner's note explained on a click.
    // Under the head, one link per source present, in its colour: a click narrows the stack to that source's rows, with a line on what they are, a second click widens it
    const present = SOURCES.filter((k) => all.some((r) => r.src === k));
    const rows = this.source ? all.filter((r) => r.src === this.source && (!r.over || this.overrides)) : all; // Show Computed keeps its struck browser rows: the defaults the author overrides are the point there
    const g = this.group({ type: "rule", head: "computed", decls: rows.map((r) => ({ type: "decl", prop: r.prop, value: r.value, important: false, on: true, live: false })), model: null }, { depth: 0 });
    if (present.length > 1) {
      const links = document.createElement("div"); links.className = "srcs";
      for (const k of ["all", ...present]) { // All leads and is the lit one at rest: every row; a source link lights when it narrows the stack
        const b = document.createElement("button"); b.type = "button"; b.className = `srcb src-${k}`; b.textContent = k === "all" ? "All" : SOURCE_NAMES[k]; b.setAttribute("aria-pressed", String((this.source || "all") === k));
        b.addEventListener("click", (e) => { e.stopPropagation(); this.source = k === "all" || this.source === k ? null : k; this.render(); });
        links.append(b);
      }
      g.querySelector(".gh").after(links);
      if (this.source) { const t = SOURCE_NOTES[this.source]; const n = this.note(typeof t === "function" ? t(getComputedStyle(this.sourceScope).color) : t); n.classList.add("srcnote", `src-${this.source}`); links.after(n); }
    }
    g.querySelectorAll(".d").forEach((row, i) => {
      row.classList.add(`src-${rows[i].src}`); row.classList.toggle("over", !!rows[i].over); row.removeAttribute("title"); // not an unsupported declaration, a computed value
      const note = span("src", `(${rows[i].note})`); row.append(note); row.classList.add("wn"); // wraps: a note that does not fit drops whole to a second line
      if (rows[i].why && !rows[i].over) note.append(this.whyButton(rows[i].why)); // the mark travels with the note
    });
    return g;
  }

  whyButton(text) {
    // A small ! mark after a source note: a click opens the one-line explanation under it, like a tooltip; one open at a time, a second click or a click elsewhere closes it
    const b = document.createElement("button");
    b.type = "button"; b.className = "whyb"; b.setAttribute("aria-label", "Why"); b.setAttribute("aria-expanded", "false");
    b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>';
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = b.getAttribute("aria-expanded") === "true";
      this.closeWhy();
      if (open) return;
      const tip = document.createElement("div"); tip.className = "why"; tip.textContent = text;
      const row = b.closest(".d"); row.append(tip); row.classList.add("wo"); b.setAttribute("aria-expanded", "true"); this.openWhy = { b, tip, row }; // under the row itself, not inside the nowrap note
    });
    return b;
  }

  closeWhy() {
    if (!this.openWhy) return;
    this.openWhy.tip.remove(); this.openWhy.row.classList.remove("wo"); this.openWhy.b.setAttribute("aria-expanded", "false"); this.openWhy = null;
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
    head.append(span("sel", n.head));
    if (n.model?.nativeFallback) head.title = "Live CSSOM values; source text differs or contains nested declarations.";
    g.append(head);
    for (const d of n.decls) {
      if (d.type === "blank") continue;
      if (d.type === "comment") { g.append(this.comment(d.text)); continue; }
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
        case "blank": break;
        case "comment": if (this.shows(n)) out.append(this.comment(n.text)); break;
        case "flat": if (this.shows(n)) out.append(this.comment(n.text)); break;
        case "opaque": if (this.shows(n)) out.append(this.comment(`${n.head} { … }`)); break;
        case "group": {
          // a group (@media, @layer …) shows under a scope only when a rule inside it does
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
          if (this.shows(n)) { out.append(this.group(n, { depth })); break; }
          // under a scope a rule that does not reach the element may still hold nested rules that do: they show under its head
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
    // A declaration the browser did not accept (or a rule the CSSOM could not pair) cannot be toggled
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
      d.on = box.checked; this.apply(d); this.syncRow(d);
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
      if (on) this.pins.add(d); else this.pins.delete(d);
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
    value.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.edit(d); } });
    row.addEventListener("pointerenter", () => { this.hover = d; this.ui.paint(); });
    row.addEventListener("pointerleave", () => { this.hover = null; this.ui.paint(); });
    row.append(box, show, sw, value, span("x", d.important ? "!important" : ""));
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
    r.row.classList.toggle("auto", !!d.auto);
    r.row.classList.toggle("block", d === this.ui.blocked());
    const color = isColor(d.prop, d.value);
    r.sw.hidden = !color;
    if (color) r.sw.style.background = d.value;
  }

  edit(d) {
    // Swaps the value for a text field: every keystroke is tried on the page, arrows step the first number,
    // Enter or leaving keeps it, Escape puts back what was there when the field opened
    if (this.editor && !this.editor.finish(false)) this.editor.finish(true); // an invalid edit left standing is cancelled
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
      for (const { prop, value, priority } of store.styleChanges(store.scratch(model, editorWrite), store.scratch(model, live))) {
        store.writeProperty(cancelStyle, prop, value, priority);
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
      status.textContent = valid ? "" : "Invalid CSS value. Correct it, or press Escape to cancel.";
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
    const keys = new AbortController(); // the window-level Escape, gone with the edit
    const finish = (cancel, restoreFocus = false) => {
      if (finished) return true;
      if (!cancel && !validate()) {
        if (restoreFocus) field.focus();
        return false;
      }
      finished = true; keys.abort();
      if (!cancel && (d.value !== start || d.on !== startOn)) this.ui.record([{ d, before: { value: start, on: startOn, important: d.important }, after: this.ui.state(d) }]);
      if (cancel) {
        absorbOutside();
        store.rebaseBaseline(model);
        if (model.inlineEl && cancelStyle.cssText === startText) {
          if (startAttribute == null) model.inlineEl.removeAttribute("style");
          else model.inlineEl.setAttribute("style", startAttribute);
        } else model.rule.style.cssText = cancelStyle.cssText;
        d.value = start; d.on = startOn;
        const originally = store.scratch(model, startText);
        if (startOn && (originally.getPropertyValue(d.prop) !== cancelStyle.getPropertyValue(d.prop) || originally.getPropertyPriority(d.prop) !== cancelStyle.getPropertyPriority(d.prop))) {
          d.value = cancelStyle.getPropertyValue(d.prop) || start;
          d.on = cancelStyle.getPropertyValue(d.prop) !== "";
          d.important = cancelStyle.getPropertyPriority(d.prop) === "important";
        }
        model.sourceText = store.scratch(model, store.declarationText(model)).cssText;
        model.lastApplied = model.rule.style.cssText;
        this.ui.queueLoad(); this.markHits(); this.ui.paint();
      }
      status.textContent = "";
      field.replaceWith(value);
      this.syncRow(d);
      if (this.editor?.field === field) this.editor = null;
      if (restoreFocus) value.focus();
      if (this.pendingRender) { this.pendingRender = false; this.render(); if (restoreFocus) this.rowOf.get(d)?.value.focus(); }
      return true;
    };
    // Escape cancels the edit wherever the focus is: an invalid field left standing after a click elsewhere still answers
    addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      e.preventDefault(); e.stopImmediatePropagation(); finish(true, true);
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
    d.value = value; d.on = true; this.apply(d); return true;
  }

  apply(d) {
    // One declaration's state onto the page, its rule's rows refreshed, the hits and the overlay with them
    this.ui.store.write(d);
    for (const entry of d.model.decls) if (entry.type === "decl") this.syncRow(entry);
    this.markHits(); this.ui.paint();
  }
}
