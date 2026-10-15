// The CSS tab: every stylesheet as rule groups and declaration rows (tick, pin, value edit), the last pick's matching rules lit in its hue, the
// inline style="" groups placed above their element's first rule. It reaches the panel through `ui` alone: view (the tab's element), body (the
// scroll box), store, status (the status line), focusPick() -> { el, hue } (the last pick), blocked() (the row the resize tool holds red),
// record(entry), state(d), queueLoad(), paint()
import { PALETTE, isColor, span } from "../util.js";

export class CssView {
  constructor(ui) {
    this.ui = ui;
    this.rowOf = new Map(); // declaration -> its rendered row parts, for the current view
    this.groups = []; // { node, el }: each rendered rule and its group box
    this.pins = new Set(); // pinned declarations: their reach painted on the page
    this.hover = null; // the declaration under the pointer
    this.editor = null; // the open value edit: { field, finish, declaration }
    this.pendingRender = false; // a rebuild that arrived while a value was being edited waits for the edit to end
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
    view.replaceChildren();
    this.hover = null; // the hovered row is gone with the old view
    this.rowOf = new Map();
    this.groups = [];
    if (!store.sheets.length && !store.inlineNodes?.length) { view.append(this.note("No stylesheet on this page.")); return; }
    for (const s of store.sheets) {
      if (store.sheets.length > 1) view.append(this.comment(`/* ${s.name} */`));
      if (s.unread) { view.append(this.comment("/* stylesheet could not be read */")); continue; }
      this.renderNodes(view, s.nodes, 0);
    }
    // An element's inline style="" sits right above the first rule that selects it, in its own colour; with no such rule it leads the list
    for (const n of store.inlineNodes || []) {
      const el = n.model.inlineEl;
      const matches = this.groups.filter((x) => x.node !== n && x.node.model && !x.node.model.inlineEl && store.matchModel(x.node.model, [el]).length > 0);
      const first = matches.find((x) => !/^\*/.test(x.node.model.selector || "")) || matches[0]; // past the universal resets, like scrollToHit
      const g = this.group(n, { depth: 0 });
      g.classList.add("inline");
      if (first) first.el.before(g); else view.prepend(g);
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
        case "comment": out.append(this.comment(n.text)); break;
        case "flat": out.append(this.comment(n.text)); break;
        case "opaque": out.append(this.comment(`${n.head} { … }`)); break;
        case "group": {
          const head = document.createElement("div");
          head.className = "gh";
          head.append(span("sel", n.head));
          out.append(head);
          this.renderNodes(out, n.children, depth + 1);
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
