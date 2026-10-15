import STYLE from "./style.css";
import { MARKUP } from "./markup.js";
import { num, PALETTE } from "./util.js";
import { Painter } from "./overlay/painter.js";
import { paintModel, paintProbe, paintMeasure, paintDistance, paintDecl } from "./overlay/draw.js";
import { CssStore } from "./css/model.js";
import { History } from "./history.js";
import { Tools } from "./tools.js";
import { Resizer } from "./tools/resize.js";
import { Picker } from "./tools/picker.js";
import { HtmlView } from "./panel/html-view.js";
import { CssView } from "./panel/css-view.js";
import { markForeign, readSource, helper, rendered, ROOTS } from "./foreign.js";

const VERSION = __VERSION__; // injected by build.mjs from package.json; the host carries it as data-version

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
    const $ = (s) => root.querySelector(s), self = this;
    this.fab = $(".fab");
    this.byeBtn = $(".bye");
    this.pickBtn = $(".pickbtn");
    this.measureBtn = $(".measure");
    this.sizeBtn = $(".sizebtn");
    this.wval = $(".wval");
    this.wblock = $(".wblock");
    this.sizetools = $(".sizetools");
    this.handle = $(".hd");
    this.stateText = $(".state");
    this.tools = new Tools({
      pickTarget: (event) => this.pickTarget(event),
      isHelper: helper,
      editing: () => !!this.editor,
      cancelEdit: () => this.editor.finish(true, true),
      say: (text) => { this.stateText.textContent = text; },
    });
    this.hresetBtn = $(".hreset");
    this.sundoBtn = $(".sundo");
    this.painter = new Painter($(".ov"));
    this.resize = new Resizer({
      host: this,
      els: { btn: this.sizeBtn, handle: this.handle, wval: this.wval, wblock: this.wblock, hreset: this.hresetBtn, sundo: this.sundoBtn, sreset: $(".sreset") },
      tools: this.tools,
      painter: this.painter,
      get store() { return self.store; },
      paint: () => this.paint(),
      queueLoad: () => this.queueLoad(),
      dirtyHtml: () => { this.htmlDirty = true; },
      syncRow: (d) => this.syncRow(d),
      revealRow: (d) => {
        // the row is brought into view: the CSS tab opens for it when the HTML tab was showing
        if (this.hasAttribute("open") && this.views.css.hidden) { this.fold(false); this.show("css"); }
        const row = this.rowOf.get(d)?.row;
        if (row && !this.views.css.hidden) row.scrollIntoView({ block: "center" });
      },
      gesture: (e, move, done) => this.gesture(e, move, done),
      suppressClick: () => this.suppressClick(),
      cancelGesture: () => this.cancelGesture?.(),
      finishEdit: () => { if (this.editor && !this.editor.finish(false)) this.editor.finish(true); },
    });
    this.hresetBtn.addEventListener("click", () => { this.resize.reset(this.resize.target); this.editor?.finish(true); this.reset(); this.resize.setBlocked(null, ""); }); // this element's size back AND every CSS edit back; picks and pins stay
    $(".rreset").addEventListener("click", () => { this.editor?.finish(true); this.reset(); this.resize.setBlocked(null, ""); });
    this.measuring = false; // the ruler: every element's frame, sizes and bands at once
    this.panel = $(".panel");
    this.head = $(".head");
    this.body = $(".body");
    this.closeBtn = $(".close");
    this.resetBtn = $(".reset");
    this.undoBtn = $(".undo");
    this.history = new History((n) => { this.undoBtn.disabled = !n; }); // CSS changes, newest last: a tick, an edit session or a Reset (a batch), each as the rows' states before and after
    this.themeBtn = $(".theme");
    this.status = $(".status");
    this.pickSurface = $(".pick-surface");
    this.tabs = [...root.querySelectorAll('[role="tab"]')];
    this.views = { html: $("#view-html"), css: $("#view-css") };
    this.picker = new Picker({
      host: this, btn: this.pickBtn, tools: this.tools,
      rows: () => this.htmlView.rows,
      loadHtml: () => this.loadHtml(),
      setPickedRow: (row, on) => this.htmlView.setPickedRow(row, on),
      openCssFor: (el) => { this.fold(false); this.htmlView.reveal(el); this.show("css"); this.scrollToHit(); },
      markHits: () => this.markHits(),
      paint: () => this.paint(),
    });
    this.htmlView = new HtmlView({
      view: this.views.html, body: this.body,
      activeElement: () => root.activeElement,
      picks: this.picker.picks,
      onPick: (el, row) => this.picker.pick(el, row),
      prune: () => this.prunePicks(),
    });
    this.store = new CssStore({
      ownNode: (node) => node === this.picker.cursorStyle,
      signal: () => this.runtime.signal,
      alive: () => this.isConnected,
      sized: this.resize.sized,
      built: () => { this.cssView.onBuilt(); this.paint(); },
      keep: (model) => model.decls.some((d) => this.pins.has(d) || this.hover === d || this.editor?.declaration === d)
        || this.resize.blocked?.model === model || this.history.some((entry) => entry.some((step) => step.d.model === model)), // the undo history, or the blocked-resize mark, still points at it
      held: (d) => this.pins.has(d) || this.editor?.declaration === d,
      dropped: (d) => this.cssView.dropped(d),
    });
    this.cssView = new CssView({
      view: this.views.css, body: this.body, store: this.store, status: this.status,
      focusPick: () => { const el = this.picker.focusEl; return { el, hue: el ? this.picker.picks.get(el)?.hue : null }; },
      blocked: () => this.resize.blocked,
      record: (entry) => this.record(entry),
      state: (d) => this.state(d),
      queueLoad: () => this.queueLoad(),
      paint: () => this.paint(),
    });
    this.loaded = false;
    this.ro = new ResizeObserver(() => this.paint());
    this.watched = new Set(); // elements the overlay follows (observe() fires once on its own, so the set never churns)

    this.onMove = () => this.paint();

    this.fab.addEventListener("click", () => this.toggle(true));
    this.closeBtn.addEventListener("click", () => this.toggle(false));
    this.resetBtn.addEventListener("click", () => this.resetAll());
    this.undoBtn.addEventListener("click", () => this.undo());
    this.themeBtn.addEventListener("click", () => this.setTheme(this.dark() ? "light" : "dark"));
    try { const t = localStorage.getItem("fm-inspector-theme"); if (t === "light" || t === "dark") this.setAttribute("theme", t); } catch {}
    this.byeBtn.addEventListener("click", () => this.dismiss());
    this.pickBtn.addEventListener("click", () => this.setPicking(!this.picking));
    this.measureBtn.addEventListener("click", () => this.setMeasuring(!this.measuring));
    this.sizeBtn.addEventListener("click", () => this.setSizing(!this.sizing));
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
    readSource().then(() => { if (this.loaded) { this.htmlDirty = true; this.queueLoad(); } });
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
      if (records.some((r) => r.type === "childList" && ROOTS().includes(r.target))) markForeign();
      const ours = (n) => n === this.picker.cursorStyle || helper(n?.nodeType === 1 ? n : n?.parentElement);
      const own = (r) => ours(r.target) || (r.type === "childList" && [...r.addedNodes, ...r.removedNodes].length > 0 && [...r.addedNodes, ...r.removedNodes].every(ours));
      const ignoreFlip = (r) => r.type === "attributes" && r.attributeName === "data-fm-inspector-ignore"; // the mark set or removed: the element joins or leaves the page's code
      if (records.every((r) => own(r) && !ignoreFlip(r))) return;
      this.htmlDirty = true;
      this.prunePicks();
      // An inline style the inspector itself just wrote is not a page change
      const ownWrite = (r) => r.type === "attributes" && r.attributeName === "style" && (this.store.modelOf.get(r.target)?.lastApplied === r.target.style.cssText || r.target === this.sizeDrag);
      const sheetish = (n) => n?.nodeType === 1 && !ours(n) && (n.matches("style, link[rel~='stylesheet'], [style]") || !!n.querySelector("style, link[rel~='stylesheet'], [style]"));
      const cssChange = records.some((r) => ignoreFlip(r) || (!own(r) && !ownWrite(r) && (
        (r.type === "attributes" && (r.attributeName === "style" || r.target.matches("style, link"))) ||
        (r.target.nodeType === 1 ? r.target.closest("style") : r.target.parentElement?.closest("style")) ||
        [...r.addedNodes, ...r.removedNodes].some(sheetish)
      )));
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
      if (!this.loaded || (!this.hasAttribute("open") && !this.pins.size && !this.picking && !this.sizing && !this.measuring)) return;
      if (this.store.changed()) this.queueLoad();
    }, 500);
    if (this.loaded) this.queueLoad();
    this.paint();
  }

  disconnectedCallback() { this.editor?.finish(true); this.dispose(); }

  dispose() {
    if (!this.connected) return;
    this.cancelGesture?.();
    this.picker.setPicking(false);
    this.resize.setSizing(false);
    this.setMeasuring(false);
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
    // The elements that left the page (or turned out to be helpers) go: out of the picks, out of the resize tool
    this.picker.prune(helper);
    this.resize.prune();
  }

  gesture(e, move, done, capture = true) {
    // Window listeners follow the pointer; capture is taken at once, or later through the returned grab()
    // (a press on a button must not be captured before it moves: a captured click lands on the handle, not the button)
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
    target.addEventListener("lostpointercapture", (event) => { if (event.target === target) end(event, true); }, options);
    const grab = () => { if (!ended) try { target.setPointerCapture(id); } catch { /* Window listeners still cover the gesture. */ } };
    if (capture) grab();
    return grab;
  }

  suppressClick() {
    this.dragged = true; clearTimeout(this.clickTimer);
    this.clickTimer = setTimeout(() => { this.dragged = false; }, 100);
  }

  draggable(handle) {
    // The whole head drags, its buttons included: a press that moves past 4px is a drag and its click is swallowed,
    // a still press stays a click (the button keeps its focus, so no preventDefault on one)
    handle.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || this.phone() || e.target.closest("input, a")) return;
      if (!e.target.closest("button")) e.preventDefault();
      const from = { x: e.clientX, y: e.clientY, ...this.anchor() };
      let moved = false;
      const grab = this.gesture(e, (event) => {
        const dx = event.clientX - from.x, dy = event.clientY - from.y;
        if (!moved && Math.hypot(dx, dy) < 4) return;
        if (!moved) grab();
        moved = true; this.setAttribute("dragging", "");
        this.moveTo(from.right - dx, from.top + dy); this.paint();
      }, (_, cancelled) => {
        if (cancelled) this.moveTo(from.right, from.top);
        if (moved) this.suppressClick();
      }, false);
    });
  }

  phone() { return matchMedia("(max-width: 480px)").matches; }

  sheetDrag(handle) {
    // Phones: pulling the head down shrinks the sheet and it stays there, down to the head alone; pushing up grows it to half the screen.
    // Only the close button closes the sheet; a double tap on the head drops it to the head and raises it again
    handle.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || !this.phone() || this.hasAttribute("folded") || e.target.closest("input, a")) return;
      if (!e.target.closest("button")) e.preventDefault();
      const from = { y: e.clientY, height: this.panel.getBoundingClientRect().height, sheet: this.panel.style.getPropertyValue("--sheet") };
      let moved = false, height = from.height;
      const grab = this.gesture(e, (event) => {
        const dy = event.clientY - from.y;
        if (!moved && Math.abs(dy) < 4) return;
        if (!moved) grab();
        moved = true; this.setAttribute("dragging", "");
        height = Math.min(Math.max(from.height - dy, this.head.offsetHeight), innerHeight / 2);
        this.panel.style.setProperty("--sheet", `${height}px`);
      }, (_, cancelled) => {
        if (cancelled) { if (from.sheet) this.panel.style.setProperty("--sheet", from.sheet); else this.panel.style.removeProperty("--sheet"); }
        if (moved) this.suppressClick();
        this.paint();
      }, false);
    });
    let lastTap = null;
    handle.addEventListener("click", (e) => {
      if (!this.phone() || this.dragged || e.target.closest("button, input, a")) { lastTap = null; return; }
      const tap = { t: Date.now(), x: e.clientX, y: e.clientY };
      const double = lastTap && tap.t - lastTap.t < 350 && Math.hypot(tap.x - lastTap.x, tap.y - lastTap.y) < 24;
      lastTap = double ? null : tap;
      if (double) this.setSheetCollapsed(!this.sheetCollapsed());
    });
  }

  sheetCollapsed() { return this.panel.getBoundingClientRect().height <= this.head.offsetHeight + 2; }

  setSheetCollapsed(on) {
    // The phone sheet down to its head alone, or back to its full height
    if (on) this.panel.style.setProperty("--sheet", `${this.head.offsetHeight}px`); else this.panel.style.removeProperty("--sheet");
    this.paint();
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
    const minW = Math.min(344, innerWidth - 16), minH = Math.min(100, innerHeight - 16); // the head's nine controls need 344
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
    w = Math.min(Math.max(w, Math.min(344, innerWidth - 16)), innerWidth - 16);
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
      this.panel.style.removeProperty("--sheet"); // a phone sheet reopens at its full height
      this.fab.focus(); // the picker stays armed: with the sheet away the page can be tapped and measured; Escape or its button ends it
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

  /* ---------- the HTML tab lives in panel/html-view.js, the picker in tools/picker.js; this is the surface the panel and the drivers reach them by ---------- */

  get rows() { return this.htmlView.rows; }
  loadHtml() { this.htmlView.load(); this.htmlDirty = false; }
  get picks() { return this.picker.picks; }
  get focusEl() { return this.picker.focusEl; }
  get probe() { return this.picker.probe; }
  get alt() { return this.picker.alt; }
  get picking() { return this.picker.picking; }
  setPicking(on) { this.picker.setPicking(on); }
  select(el) { this.picker.select(el); }
  pick(el, row) { this.picker.pick(el, row); }
  clearPicks() { this.picker.clear(); }

  /* ---------- the resize tool lives in tools/resize.js; this is the surface the panel and the drivers reach it by ---------- */

  get sizing() { return this.resize.sizing; }
  get sizeTarget() { return this.resize.target; }
  get sized() { return this.resize.sized; }
  get sizeDrag() { return this.resize.drag; }
  get blocked() { return this.resize.blocked; }
  setSizing(on) { this.resize.setSizing(on); }
  chooseSize(el) { this.resize.choose(el); }
  resizeStart(el) { return this.resize.start(el); }
  resizeWidth(session, desired) { this.resize.width(session, desired); }
  finishResize(session, cancelled) { this.resize.finish(session, cancelled); }
  sizeReset(el, record) { this.resize.reset(el, record); }
  sizeUndo() { this.resize.undo(); }
  sizeResetAll() { this.resize.resetAll(); }
  setBlocked(d, text, area) { this.resize.setBlocked(d, text, area); }

  pickTarget(event) {
    // The page element under a pointer event, found through the shield: the shield alone is excluded from the hit test
    const path = event.composedPath();
    if (!path.includes(this.pickSurface)) return path.includes(this) ? null : event.target;
    this.pickSurface.style.pointerEvents = "none";
    const point = event.touches?.[0] || event.changedTouches?.[0] || event;
    try { return document.elementsFromPoint(point.clientX, point.clientY).find((el) => !helper(el)) || null; } // through an extension's overlay
    finally { this.pickSurface.style.pointerEvents = ""; }
  }

  /* ---------- the overlay ---------- */

  marks() {
    // Everything to paint: picked elements, the probe under the picker, pinned/hovered declarations as their reach
    const list = [...this.picks].map(([el, p]) => ({ el, model: true, hue: p.hue }));
    if (this.probe && !this.picks.has(this.probe)) {
      if (this.alt && this.focusEl) list.push({ el: this.probe, dist: true });
      else list.push({ el: this.probe, probe: true });
    }
    if (this.resize.sizing && this.resize.target) list.push({ el: this.resize.target, size: true });
    if (this.resize.sizing && this.resize.heldArea?.isConnected && this.wblock.textContent) list.push({ el: this.resize.heldArea, hold: true }); // the area that held the last resize
    if (this.measuring) {
      // the ruler: the elements in the viewport, at most 300 of them (a long page's off-screen chips clamped into view were noise)
      const right = document.documentElement.clientWidth || innerWidth, bottom = document.documentElement.clientHeight || innerHeight;
      let count = 0;
      for (const el of [document.body, ...document.body.querySelectorAll("*")]) {
        if (this.picks.has(el) || !rendered(el)) continue;
        const r = this.painter.rect(el);
        if (r.width > 0 && r.height > 0 && r.right > 0 && r.bottom > 0 && r.left < right && r.top < bottom) { list.push({ el, measure: true }); if (++count >= 300) break; }
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
      // Nested, scoped and container rules are judged by the browser, so every element is a candidate
      const nativeSelectors = model.scoped || model.wraps.some((h) => !h.startsWith("@"));
      if (nativeSelectors) candidates = [...document.querySelectorAll("*")];
      else try { candidates = [...document.querySelectorAll(model.selector)]; } catch { candidates = []; }
    }
    const result = this.store.matchModel(model, candidates.filter(rendered));
    this.reachCache?.set(model, result); return result;
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
    this.prunePicks(); this.painter.begin(); this.reachCache = new Map();
    const marks = this.marks().filter((m) => rendered(m.el));
    for (const { el } of marks) this.painter.geometry(el);
    const keep = new Set(marks.map((m) => m.el));
    for (const el of this.watched) if (!keep.has(el)) { this.ro.unobserve(el); this.watched.delete(el); }
    for (const el of keep) if (!this.watched.has(el)) { this.ro.observe(el); this.watched.add(el); }
    const chrome = (this.hasAttribute("open") ? this.panel : this.fab).getBoundingClientRect();
    for (const m of marks) {
      this.painter.group(m.probe ? "pick probe" : m.decl ? "pick decl" : m.measure ? "pick ruler" : "pick", m.model ? `var(--pick-${m.hue % PALETTE})` : m.decl ? "var(--css)" : null);
      if (m.model) paintModel(this.painter, m.el, m.hue, chrome, this.focusEl);
      else if (m.probe) paintProbe(this.painter, m.el, chrome);
      else if (m.dist) paintDistance(this.painter, this.focusEl, m.el, chrome);
      else if (m.measure) paintMeasure(this.painter, m.el, chrome);
      else if (m.size) this.resize.paintSizer(m.el);
      else if (m.hold) this.resize.paintHold(m.el, chrome);
      else paintDecl(this.painter, m.el, m.decl, chrome);
    }
    this.painter.end(); this.reachCache = null;
  }

  setMeasuring(on) {
    // The ruler touches nothing else: picks, pins and the picker stay as they are under it
    if (on === this.measuring) return;
    this.measuring = on;
    if (on) {
      // Any click anywhere but the ruler button itself and the two tool toggles beside it, on the page or in the panel, turns the ruler off; the page still gets its click.
      // While the picker or the resize tool is armed, their page clicks are theirs and the ruler stays
      this.rulerRuntime = new AbortController();
      addEventListener("click", (e) => {
        const path = e.composedPath();
        if (this.dragged || path.includes(this.measureBtn) || path.includes(this.pickBtn) || path.includes(this.sizeBtn)) return;
        if (this.tools.active && (!path.includes(this) || path.includes(this.pickSurface))) return; // a page click an armed tool takes through its shield (a pick, a resize choice) leaves the ruler standing
        this.setMeasuring(false);
      }, { capture: true, signal: this.rulerRuntime.signal });
    } else this.rulerRuntime?.abort();
    this.measureBtn.setAttribute("aria-pressed", String(on));
    this.toggleAttribute("measuring", on);
    this.paint();
  }

  /* ---------- the CSS tab lives in panel/css-view.js; this is the surface the panel and the drivers reach it by ---------- */

  get rowOf() { return this.cssView.rowOf; }
  get pins() { return this.cssView.pins; }
  get hover() { return this.cssView.hover; }
  get editor() { return this.cssView.editor; }
  renderCss() { this.cssView.render(); }
  markHits() { this.cssView.markHits(); }
  scrollToHit() { this.cssView.scrollToHit(); }
  syncRow(d) { this.cssView.syncRow(d); }
  apply(d) { this.cssView.apply(d); }

  /* ---------- undo: the CSS changes, stepped back one at a time ---------- */

  state(d) { return { value: d.value, on: d.on, important: d.important }; } // a snapshot: undo judges the step against it, not against the model the page may have changed since

  record(entry) {
    this.history.push(entry);
  }

  undo() {
    // Puts the rows of the last change back as they were, through the same write path as a tick; a Reset steps back as one
    const entry = this.history.pop();
    if (!entry) return;
    this.editor?.finish(true);
    for (const { d, before, after } of [...entry].reverse()) {
      const model = d.model;
      if (!this.store.modelAvailable(model) || !model.decls.includes(d)) continue; // the rule or the declaration is gone
      // The page wrote this property itself since the step (another value, another priority): its write stands, the step is skipped
      const expected = this.store.scratch(model, this.store.declarationText(model, { d, state: after }));
      if (model.rule.style.getPropertyValue(d.prop) !== expected.getPropertyValue(d.prop) || model.rule.style.getPropertyPriority(d.prop) !== expected.getPropertyPriority(d.prop)) continue;
      d.value = before.value; d.on = before.on; d.important = before.important;
      this.apply(d); this.syncRow(d);
    }
  }

  resetAll() {
    // The head's Reset: the page's CSS back, every pick and pin cleared, the picker and the ruler off
    this.editor?.finish(true);
    this.picker.setPicking(false);
    this.resize.setSizing(false);
    this.setMeasuring(false);
    this.resize.resetAll();
    this.reset();
    this.clearMarks();
  }

  clearMarks() {
    // Every pick and pin off the page and out of the rows; the CSS edits stay
    this.picker.clear();
    this.cssView.clearMarks();
    this.paint();
  }

  reset() {
    // Every CSS edit back; the undo history goes with them (Alper's call: a reset starts clean)
    this.history.clear();
    for (const model of this.store.dirtyModels) if (!this.store.modelAvailable(model)) this.store.dirtyModels.delete(model); // its rule or element left the page: nothing to put back
    for (const model of this.store.dirtyModels) {
      const touched = model.rule.style.cssText !== model.lastApplied; // the page wrote the rule since the tool's last write
      this.store.rebaseBaseline(model);
      if (model.inlineEl && model.originalAttribute == null) model.inlineEl.removeAttribute("style");
      else if (model.inlineEl) model.inlineEl.setAttribute("style", model.originalAttribute);
      else model.rule.style.cssText = model.baseline;
      for (const d of model.decls) if (d.type === "decl") {
        d.value = d.orig; d.on = true; this.syncRow(d);
      }
      model.lastApplied = model.rule.style.cssText;
      model.sourceText = model.lastApplied;
      if (touched) { this.store.dirtyModels.delete(model); this.store.reconcileModel(model); } // its rows are rebuilt from the live text: the page's additions are in the model, so a later edit leaves them alone
    }
    this.store.dirtyModels.clear();
    this.queueLoad();
    this.paint();
  }

}

if (!customElements.get("fm-inspector")) {
  customElements.define("fm-inspector", Inspector);
  const mount = () => { if (!document.querySelector("fm-inspector")) document.body.append(document.createElement("fm-inspector")); };
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount, { once: true });
}
