// The CSS model: every stylesheet of the page read CSSOM-first (the sources fetched afterwards for comments and blank lines),
// each rule's declarations as editable models, the page's inline styles, the poll's snapshot and the write path.
// It talks back to the panel through `ui` alone: ownNode, signal, alive, sized, built, keep, held, dropped.
import { parseBlock, parseDecls, link, ruleHead, resolveSelector } from "./parse.js";
import { helper, sourceStyles } from "../foreign.js";
import { name } from "../util.js";

export class CssStore {
  constructor(ui) {
    this.ui = ui;
    this.models = [];
    this.modelOf = new WeakMap();
    this.dirtyModels = new Set();
    this.cssSources = new WeakMap();
    this.probeName = `--fm-inspector-${Math.random().toString(36).slice(2)}-active`;
    this.sheets = []; // parsed stylesheets: { name, nodes, unread }
    this.allDecls = []; // every live declaration, for Reset
    this.inlineNodes = [];
    this.cssState = null; // the poll's record
    this.cssGeneration = 0;
  }

  changed() {
    // The poll's question: does the page's CSS differ from the record the last build left?
    return !this.sameSnapshot(this.cssState, this.cssSnapshot());
  }

  sourceSheets(repeats = false) {
    // The page's stylesheets in cascade order; a sheet adopted twice counts at its LAST position (that is where it cascades), the poll's record keeps the repeats
    const all = [...document.styleSheets, ...(document.adoptedStyleSheets || [])]
      .filter((sheet) => (!sheet.ownerNode || (!this.ui.ownNode(sheet.ownerNode) && !helper(sheet.ownerNode))) && !this.blockerSheet(sheet));
    return repeats ? all : all.filter((sheet, index) => all.lastIndexOf(sheet) === index);
  }

  blockerSheet(sheet) {
    // A browser extension's cosmetic filter list (an ad blocker's): a page-level sheet of many rules that only hide elements; not the solution's code
    if (sheet.href) return false;
    if (sheet.ownerNode?.localName === "style" && sourceStyles()?.has(sheet.ownerNode.textContent.trim())) return false; // the page's own, whatever it holds
    let rules;
    try { rules = [...sheet.cssRules]; } catch { return false; }
    const styled = rules.filter((rule) => rule.style);
    if (styled.length < 10 || styled.length < rules.length * 0.9) return false;
    const hiding = styled.filter((rule) => rule.style.length === 1 && rule.style.getPropertyValue("display") === "none" && rule.style.getPropertyPriority("display") === "important");
    if (hiding.length < styled.length * 0.9) return false;
    // The selectors read like a filter list: links by address, or ad/banner/sponsor names
    const listish = hiding.filter((rule) => /\[href|\b(ads?|advert|banner|sponsor|promo|popup|cookie|tracker)\b/i.test(rule.selectorText || ""));
    return listish.length >= hiding.length / 2;
  }

  cssSnapshot() {
    // Every stylesheet (imported ones included) in cascade order, with its state and each top-level rule's text; settle() refreshes one rule's entry after an own write
    const entries = new Map(), order = this.sourceSheets(true);
    const visit = (sheet) => {
      if (entries.has(sheet)) return;
      let rules;
      try { rules = [...sheet.cssRules]; } catch { entries.set(sheet, { meta: "unreadable", rules: [] }); return; }
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
    // The top-level rule a model's rule sits in: the unit the poll records
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
        if (this.ui.sized.has(el)) { // the declarations the resize tool wrote, not the page's own: a light tint on their rows
          const own = this.ui.sized.get(el), before = own ? parseDecls(own, 0, own.length) : [];
          for (const d of model.decls) if (d.type === "decl" && !before.some((b) => b.type === "decl" && b.prop === d.prop && b.value === d.value)) d.auto = true;
        }
        inline.push({ type: "rule", head, rule: model.rule, model, decls: model.decls });
      }
      this.inlineNodes = inline; // rendered above each element's first rule, not as a sheet of their own
      this.cssState = this.cssSnapshot();
      this.ui.built();
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
    if (signal.aborted || !this.ui.alive() || generation !== this.cssGeneration) throw new DOMException("Disconnected", "AbortError");
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
    const rule = meta.inlineEl ? { style: owner.style, selectorText: "element.style" } : owner;
    let decls = sourceDecls || [], accepted = false;
    if (decls.length) {
      // the source still describes the live rule: its lines (comments and blank lines included) are the rows
      const text = decls.filter((d) => d.type === "decl").map((d) => `${d.prop}: ${d.value}${d.important ? " !important" : ""};`).join("\n");
      try { accepted = this.scratch({ head }, text).cssText === rule.style.cssText; } catch { accepted = false; }
    }
    // A clean model nothing points at (no pin, hover, edit or undo step) is rebuilt from the source when the source still matches the live rule, so the
    // comments come back once the sources are fetched. A rule the page has changed keeps its model and reconciles instead: a rebuild from the CSSOM
    // alone would lose the lines the CSSOM collapses (`color: red !important; color: blue;` reads back as the red alone)
    if (model && !this.dirtyModels.has(model) && !this.ui.keep(model) && accepted) model = null;
    if (!model) {
      model = { rule, head, ...meta, baseline: rule.style.cssText, originalAttribute: meta.inlineEl?.getAttribute("style") ?? null };
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

  scratch(model, text = "") {
    let style;
    if (/^@(?:font-face|page)\b/.test(model.head)) {
      const sheet = new CSSStyleSheet(); sheet.replaceSync(`${model.head} {}`); style = sheet.cssRules[0].style;
    } else style = document.createElement("div").style;
    style.cssText = text; return style;
  }

  declarationText(model, swap = null) {
    // The on-declarations as one block; swap = { d, state } reads one of them in another state
    return model.decls.map((d) => (swap && d === swap.d ? { ...d, ...swap.state } : d)).filter((d) => d.type === "decl" && d.on)
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
    const pending = new Map(this.styleChanges(this.scratch(model, model.lastApplied), this.scratch(model, live)).map((change) => [change.prop, change]));
    // A declaration the page wrote as a shorthand lands as that shorthand when every longhand it sets changed (WebKit serializes longhands set one by one in another form)
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
    const old = model.decls.filter((d) => d.type === "decl"), used = new Set();
    const baseline = this.scratch(model, model.baseline);
    // A live entry takes the old declaration that carries its value when there are several of the property (the fallback chain's edited line keeps its identity), else the first
    const norm = (d) => this.normValue(model, d);
    model.decls = parseDecls(live, 0, live.length).map((entry) => {
      if (entry.type !== "decl") return entry;
      const same = old.filter((candidate) => candidate.prop === entry.prop && candidate.on && !used.has(candidate));
      // several lines of the property: the one carrying the live value, else the one the cascade let win (the last of the entry's priority, else the last)
      const winner = same.length > 1 ? same.find((candidate) => norm(candidate) === norm(entry)) || [...same].reverse().find((candidate) => !!candidate.important === !!entry.important) || same.at(-1) : same[0];
      const d = winner || { model, rule: model.rule };
      used.add(d);
      // a line whose value did not change keeps its own orig (a fallback line of a chain must not take the chain's winning value); a changed one takes the baseline's
      const orig = d.orig != null && norm(d) === norm(entry) ? d.orig : baseline.getPropertyValue(entry.prop);
      Object.assign(d, entry, { orig, live: true, on: true });
      return d;
    });
    // Disabled declarations remain available for re-enabling and Reset.
    // A live declaration the CSSOM collapsed (`color: red !important; color: blue;` reads back as the red alone) keeps its row: its line stands in the source,
    // and Reset and the write path replay the whole chain as the sheet would; it sits right after the line that won
    for (const d of old) if (!used.has(d)) {
      if (this.ui.held(d) || !d.on) {
        d.on = false;
        if (!old.some((x) => x !== d && x.prop === d.prop)) d.orig = baseline.getPropertyValue(d.prop) || d.orig; // a line of a chain keeps its own
        model.decls.push(d);
      } else if (model.decls.some((x) => x.type === "decl" && x.prop === d.prop)) {
        // in the source's order: before the first kept line of the property that followed it, else after the last one
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
    // A declaration's value and priority as the browser serializes them, for comparing a source line with a live entry
    const s = this.scratch(model, `${d.prop}: ${d.value}${d.important ? " !important" : ""}`);
    return `${s.getPropertyValue(d.prop)}${s.getPropertyPriority(d.prop) ? " !important" : ""}`;
  }

  settleChains(model) {
    // The rows must add up to the live rule. A kept line of a chain that would beat the page's own value (an important line the page replaced
    // with a normal one) goes off: it stays as a row, struck, the user can turn it back on; the line carrying the live value stays on
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
    // After an own write, the poll's entry for the top-level rule is refreshed only when it still matched the rule's text before the write;
    // a change the page made there (a sibling in the same @media, a declaration added a moment ago) keeps the entry stale, so the poll rebuilds
    const top = this.topRule(model);
    if (!top || !this.cssState) return;
    const entry = this.cssState.entries.get(top.parentStyleSheet);
    let index = -1;
    try { index = entry ? [...top.parentStyleSheet.cssRules].indexOf(top) : -1; } catch { index = -1; }
    if (index >= 0 && entry.rules[index] === before) entry.rules[index] = top.cssText;
  }

  modelAvailable(model) {
    // The model's owner is still on the page, in its own stylesheet (or its inline element connected): a cached model is no proof of that
    const owner = model.inlineEl || model.rule;
    if (this.modelOf.get(owner) !== model || !this.models.includes(model)) return false;
    if (model.inlineEl) return model.inlineEl.isConnected && !helper(model.inlineEl);
    if (!this.sourceSheets().includes(model.sheetChain?.[0])) return false;
    let rule = model.rule;
    try {
      while (rule.parentRule) { if (![...rule.parentRule.cssRules].includes(rule)) return false; rule = rule.parentRule; }
      return !!rule.parentStyleSheet && [...rule.parentStyleSheet.cssRules].includes(rule);
    } catch { return false; }
  }

  write(d) {
    // Writes one declaration's state onto the page: only this edit's property changes land, the page's unrelated live declarations stay
    const model = d.model;
    const style = model.rule.style;
    const before = this.topRule(model)?.cssText; // the poll's unit as it stood before this write
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
    this.settle(model, before);
  }
}
