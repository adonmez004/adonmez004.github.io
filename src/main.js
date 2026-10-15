import STYLE from "./style.css";
import { MARKUP } from "./markup.js";
import { VOID, squash, num, fmt, camel, name, PALETTE, TRUNC, isColor, sides, SIZE, span } from "./util.js";
import { Painter } from "./overlay/painter.js";
import { CssStore } from "./css/model.js";
import { History } from "./history.js";
import { Tools } from "./tools.js";
import { skip, markForeign, readSource, helper, rendered, ROOTS } from "./foreign.js";
import { scanTo, parseDecls, canonicalHead } from "./css/parse.js";

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
    const $ = (s) => root.querySelector(s);
    this.fab = $(".fab");
    this.byeBtn = $(".bye");
    this.pickBtn = $(".pickbtn");
    this.measureBtn = $(".measure");
    this.sizeBtn = $(".sizebtn");
    this.wval = $(".wval");
    this.wblock = $(".wblock");
    this.sizetools = $(".sizetools");
    this.blocked = null; // the declaration found to keep the last resize from landing
    this.handle = $(".hd");
    this.stateText = $(".state");
    this.tools = new Tools({
      pickTarget: (event) => this.pickTarget(event),
      isHelper: helper,
      editing: () => !!this.editor,
      cancelEdit: () => this.editor.finish(true, true),
      say: (text) => { this.stateText.textContent = text; },
    });
    this.tools.register("sizing", {
      label: "Click an element to resize · Esc to end",
      handlers: () => ({
        click: (target) => this.chooseSize(target),
        escape: () => { this.setSizing(false); this.sizeBtn.focus(); },
      }),
      release: () => this.cancelResize(), // a running drag ends when the tool changes hands or closes
    });
    this.tools.register("picking", {
      label: "Select an element · Esc to cancel",
      handlers: () => ({
        move: (target, event) => {
          this.alt = event.altKey;
          if (target !== this.probe || this.alt !== this.altWas) { this.probe = target; this.altWas = this.alt; this.paint(); }
        },
        leave: () => { if (this.probe) { this.probe = null; this.paint(); } },
        click: (target) => this.select(target),
        escape: () => { this.setPicking(false); this.pickBtn.focus(); },
        key: (event) => { if (event.key === "Alt" && this.alt !== (event.type === "keydown")) { this.alt = event.type === "keydown"; this.paint(); } },
      }),
      arm: () => {
        // A page-wide crosshair says the next click picks; the inspector keeps its own cursors
        this.cursorStyle ||= Object.assign(document.createElement("style"), { textContent: "html, html *:not(fm-inspector) { cursor: crosshair !important; }" });
        document.head.append(this.cursorStyle);
      },
      release: () => { this.cursorStyle?.remove(); this.probe = null; },
    });
    this.sizing = false; // the resize tool: a click on the page chooses the element, its corner handle drags its width and height
    this.sizeTarget = null;
    this.sized = new Map(); // element -> its style attribute before the first resize, for Reset
    this.wrote = new WeakMap(); // element -> { attr, prop }: the style attribute as the tool last left it and the property it wrote; a live size that differs is the page's
    this.sizeHandle(this.handle);
    this.hresetBtn = $(".hreset");
    this.hresetBtn.addEventListener("click", () => { this.sizeReset(this.sizeTarget); this.editor?.finish(true); this.reset(); this.setBlocked(null, ""); }); // this element's size back AND every CSS edit back; picks and pins stay
    this.sizeHistory = new History((n) => { this.sundoBtn.disabled = !n; }); // resizes, newest last: { el, before, after } style attributes
    this.sundoBtn = $(".sundo");
    this.sundoBtn.addEventListener("click", () => this.sizeUndo());
    $(".sreset").addEventListener("click", () => this.sizeResetAll());
    $(".rreset").addEventListener("click", () => { this.editor?.finish(true); this.reset(); this.setBlocked(null, ""); });
    this.measuring = false; // the ruler: every element's frame, sizes and bands at once
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
    this.undoBtn = $(".undo");
    this.history = new History((n) => { this.undoBtn.disabled = !n; }); // CSS changes, newest last: a tick, an edit session or a Reset (a batch), each as the rows' states before and after
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
      built: () => { if (!this.editor) this.renderCss(); else this.pendingCssRender = true; this.paint(); },
      keep: (model) => model.decls.some((d) => this.pins.has(d) || this.hover === d || this.editor?.declaration === d)
        || this.blocked?.model === model || this.history.some((entry) => entry.some((step) => step.d.model === model)), // the undo history, or the blocked-resize mark, still points at it
      held: (d) => this.pins.has(d) || this.editor?.declaration === d,
      dropped: (d) => { if (this.hover === d) this.hover = null; },
    });
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
      const ours = (n) => n === this.cursorStyle || helper(n?.nodeType === 1 ? n : n?.parentElement);
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
    this.setPicking(false);
    this.setSizing(false);
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
    for (const [el] of this.picks) if (!el.isConnected || helper(el)) this.picks.delete(el);
    if (!this.focusEl?.isConnected || helper(this.focusEl)) this.focusEl = [...this.picks.keys()].pop() || null;
    for (const el of this.sized.keys()) if (!el.isConnected || helper(el)) this.sized.delete(el);
    if (this.sizeTarget && (!this.sizeTarget.isConnected || helper(this.sizeTarget))) {
      this.cancelResize();
      this.sizeTarget = null; this.handle.removeAttribute("data-on"); this.hresetBtn.removeAttribute("data-on"); this.wval.textContent = "";
    }
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

  /* ---------- HTML tab: the body as rows ---------- */

  setPickedRow(row, on) {
    row.dataset.picked = String(on);
    row.pickButton?.setAttribute("aria-pressed", String(on));
  }

  loadHtml() {
    markForeign();
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
    if (!foldable) { caret.classList.add("none"); caret.disabled = true; caret.tabIndex = -1; if (!VOID.has(el.localName)) select.append(span("tag", `</${el.localName}>`)); return; }
    caret.addEventListener("click", () => this.setFolded(row, !row.hasAttribute("data-folded")));
    if (textOnly) {
      const text = squash(kids.map((n) => n.data).join(""));
      row.tx = span("tx", text); row.full = text;
      select.append(row.tx, span("tag", `</${el.localName}>`));
      if (text.length > TRUNC) this.setFolded(row, true);
      else { caret.classList.add("none"); caret.disabled = true; caret.tabIndex = -1; }
      return;
    }
    select.append(span("fold c", "…"), span("fold tag", `</${el.localName}>`));
    for (const n of kids) {
      if (n.nodeType === 1) this.tree(out, n, depth + 1);
      else { const child = this.row(depth + 1); child.append(span(n.nodeType === 8 ? "c" : "tx", n.nodeType === 8 ? `<!--${n.data}-->` : squash(n.data))); out.append(child); }
    }
    const close = this.row(depth); close.classList.add("cl"); close.append(span("tag", `</${el.localName}>`));
    out.append(close); row.close = close;
  }

  row(depth) {
    const row = document.createElement("div"); row.className = "row"; row.style.setProperty("--d", depth); return row;
  }

  openTag(el) {
    // One span for the whole tag: a flex row drops bare whitespace text between items
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

  /* ---------- the resize tool: one element at a time, by its handles ---------- */

  setSizing(on) {
    // The resize tool and the picker stand together: the one armed last takes the page's clicks, the other keeps its state (the chosen element,
    // its handle and bar; the picks) and takes the clicks back when that one ends. Closing a tool closes its own things only
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
    // The resize as a fixed px size; once it reaches the parent's content box (where that box is a plain limit) it is written as 100%
    // instead, so the element follows the parent from then on (a content-box element keeps its padding and border out of the percentage).
    // The content pass asks for px only: a 100% against a content-sized parent is cyclic and would open the element to its max-content.
    // The property is the logical one that is the physical width (block-size in a vertical writing mode); an !important already on it stays
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
    return base > 0 && px > base + 0.5; // capped at the parent
  }

  sizeProp(el) { return /^(vertical|sideways)/.test(getComputedStyle(el).writingMode) ? "block-size" : "inline-size"; }

  sizeOf(el, attr, prop = this.sizeProp(el)) {
    // The size property as a style attribute string holds it: value, priority, and the attribute's normalized text.
    // The property is the one the tool wrote at the time (a step keeps it), so a writing mode the page changed since does not redirect the step
    const style = document.createElement("div").style;
    style.cssText = attr || "";
    return { prop, value: style.getPropertyValue(prop), priority: style.getPropertyPriority(prop), cssText: style.cssText };
  }

  restoreSize(el, attr, prop = this.sizeProp(el)) {
    // Only the size property goes back to what the attribute held; whatever else the page (or the panel) wrote onto the element since stands.
    // The attribute itself is put back verbatim once the live style equals it, so an element that had none loses it again
    if (!el.isConnected) return;
    const want = this.sizeOf(el, attr, prop);
    this.store.writeProperty(el.style, want.prop, want.value, want.priority);
    if (el.style.cssText === want.cssText) this.restoreStyle(el, attr);
    this.wrote.set(el, { attr: el.getAttribute("style"), prop });
  }

  pageSized(el) {
    // The page wrote the size property itself since the tool's last write (another value, another priority): its write stands, the tool's step is skipped
    const ours = this.wrote.get(el);
    if (!ours) return false;
    const now = this.sizeOf(el, el.getAttribute("style"), ours.prop), expected = this.sizeOf(el, ours.attr, ours.prop);
    return now.value !== expected.value || now.priority !== expected.priority;
  }

  cancelResize() { if (this.sizeDrag) this.cancelGesture?.(); }

  resizeSupported(el) {
    // A transformed or zoomed element (or ancestor) renders at another scale than its CSS size: the drag would write the wrong number
    for (let node = el; node; node = node.parentElement) {
      const cs = getComputedStyle(node);
      if (cs.transform !== "none" || (cs.zoom && cs.zoom !== "normal" && num(cs.zoom) !== 1)) return false;
    }
    return true;
  }

  parentBase(el) {
    // The parent's content-box width when it limits the element plainly, else 0 (an auto grid track, a positioned or inline element)
    const parent = el.parentElement, cs = getComputedStyle(el);
    if (!parent || /absolute|fixed/.test(cs.position) || cs.display === "inline") return 0;
    const pcs = getComputedStyle(parent);
    if (/grid/.test(pcs.display) && this.sizeLimits(el, cs).whyW !== "grid") return 0; // an auto track: cyclic
    return parent.getBoundingClientRect().width - num(pcs.paddingLeft) - num(pcs.paddingRight) - num(pcs.borderLeftWidth) - num(pcs.borderRightWidth);
  }

  crush(el, kids) {
    // The parent wins: every descendant resized earlier that now reaches past its own parent's content box is narrowed to fit, outer ones first
    const depth = (node) => { let n = 0; for (let p = node; p && p !== el; p = p.parentElement) n++; return n; };
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
    // What the layout allows the element's width: a grid item in a FIXED track (a length, a percentage or fr the parent declared) stays in its area;
    // an auto track grows with it, and the parent's content box is the limit there
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
          if (overlaps) { if (first < 0) first = i; last = i; width += size + (first < i ? gap : 0); }
          x += size + gap;
        });
        const fixed = (t) => /^(\d|\.)/.test(t) && /(px|%|em|rem|vw|vh|vmin|vmax|fr|ch|ex)$/.test(t) || /^minmax\(.*,\s*(\d|\.)[^)]*(px|%|em|rem|vw|vh|fr|ch)\)$/.test(t);
        if (first >= 0 && tokens.length && Array.from({ length: last - first + 1 }, (_, k) => tokens[Math.min(first + k, tokens.length - 1)]).every(fixed)) { out.w = width; out.whyW = "grid"; }
      }
    }
    return out;
  }

  declaredOn(el, props) {
    // The last live declaration of one of the props in the rules reaching the element
    const models = this.store.models.filter((m) => !m.inlineEl && this.store.matchModel(m, [el]).length > 0);
    for (const m of models.reverse()) for (const d of [...m.decls].reverse()) if (d.type === "decl" && d.on && d.live && props.includes(d.prop)) return d;
    return null;
  }

  trackTokens(value, limit = 2048) {
    // The declared track list as tokens: bracketed line names and comments dropped, a numeric repeat() unrolled (capped), an auto-fill/auto-fit repeat reduced to its pattern
    const tokens = [];
    let depth = 0, brackets = 0, quote = null, token = "";
    const source = value.replace(/\/\*[\s\S]*?\*\//g, "");
    for (let i = 0; i < source.length; i++) {
      const ch = source[i];
      if (quote) { token += ch; if (ch === "\\") token += source[++i] || ""; else if (ch === quote) quote = null; continue; }
      if (ch === '"' || ch === "'") quote = ch;
      else if (ch === "(") depth++; else if (ch === ")") depth = Math.max(0, depth - 1);
      else if (ch === "[") brackets++; else if (ch === "]") brackets = Math.max(0, brackets - 1);
      if (/\s/.test(ch) && !depth && !brackets) { if (token) tokens.push(token); token = ""; } else token += ch;
    }
    if (token) tokens.push(token);
    const out = [];
    for (const item of tokens) {
      if (out.length >= limit) break;
      if (/^\[.*\]$/.test(item)) continue;
      const repeat = item.match(/^repeat\((auto-fill|auto-fit|\d+),\s*(.*)\)$/);
      if (!repeat) { out.push(item); continue; }
      const inner = this.trackTokens(repeat[2], limit - out.length);
      if (!inner.length) continue;
      const count = /^\d+$/.test(repeat[1]) ? Math.min(Number(repeat[1]), Math.ceil((limit - out.length) / inner.length)) : 1;
      for (let n = 0; n < count && out.length < limit; n++) out.push(...inner.slice(0, limit - out.length));
    }
    return out;
  }

  contentNeed(el) {
    // How far the element's content reaches past its padding box, per axis, when its overflow is visible
    const cs = getComputedStyle(el), out = { x: 0, y: 0 };
    if (cs.display === "inline" || !el.scrollWidth) return out;
    if (cs.overflowX === "visible") out.x = el.scrollWidth - el.clientWidth;
    if (cs.overflowY === "visible") out.y = el.scrollHeight - el.clientHeight;
    return out;
  }

  overflow(el, parent) {
    // How far the element's margin box reaches past the parent's content box, per axis
    const r = el.getBoundingClientRect(), pr = parent.getBoundingClientRect(), pcs = getComputedStyle(parent), cs = getComputedStyle(el);
    const right = pr.right - num(pcs.paddingRight) - num(pcs.borderRightWidth), bottom = pr.bottom - num(pcs.paddingBottom) - num(pcs.borderBottomWidth);
    return { x: r.right + Math.max(num(cs.marginRight), 0) - right, y: r.bottom + Math.max(num(cs.marginBottom), 0) - bottom };
  }

  explainSize(el, wantW) {
    // After a resize: when the element did not take the width, the property that kept it (a max or min, an important width,
    // display inline, flex, a grid track, both insets, the parent, its own content) is named in the warning and its row lit in the CSS tab
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el), parent = el.parentElement, pcs = parent ? getComputedStyle(parent) : null;
    const axes = Math.abs(wantW - r.width) > 1 ? [{ axis: "x", want: wantW, got: r.width }] : [];
    this.setBlocked(null, "");
    if (!axes.length) return;
    const rendered = (x) => this.store.matchModel(x, [el]).length > 0;
    const own = this.store.models.filter((m) => !m.inlineEl && m.decls.some((d) => d.type === "decl" && d.on) && rendered(m));
    const above = parent ? this.store.models.filter((m) => !m.inlineEl && m.decls.some((d) => d.type === "decl" && d.on) && this.store.matchModel(m, [parent]).length > 0) : [];
    const find = (models, props) => { for (const m of [...models].reverse()) for (const d of [...m.decls].reverse()) if (d.type === "decl" && d.on && d.live && props.includes(d.prop)) return d; return null; };
    const flex = /flex/.test(pcs?.display || ""), grid = /grid/.test(pcs?.display || ""), row = !/column/.test(pcs?.flexDirection || "");
    for (const { axis, want, got } of axes) {
      const x = axis === "x";
      const cap = this.sizeCap?.[axis];
      // The element's own max or min comes first: when the width it took IS its max (or min), that rule held it, whatever cap the drag also met
      const maxP = x ? ["max-width", "max-inline-size"] : ["max-height", "max-block-size"], minP = x ? ["min-width", "min-inline-size"] : ["min-height", "min-block-size"];
      const maxC = x ? cs.maxWidth : cs.maxHeight, minC = x ? cs.minWidth : cs.minHeight;
      const pad = cs.boxSizing === "content-box" ? (x ? num(cs.paddingLeft) + num(cs.paddingRight) + num(cs.borderLeftWidth) + num(cs.borderRightWidth) : num(cs.paddingTop) + num(cs.paddingBottom) + num(cs.borderTopWidth) + num(cs.borderBottomWidth)) : 0;
      if (maxC !== "none" && got < want && Math.abs(num(maxC) + pad - got) <= 1) { const d = find(own, maxP); this.setBlocked(d, `held by ${d ? `${d.prop}: ${d.value}` : `${maxP[0]}: ${maxC}`}`); return; }
      if (minC !== "auto" && num(minC) > 0 && got > want && Math.abs(num(minC) + pad - got) <= 1) { const d = find(own, minP); this.setBlocked(d, `held by ${d ? `${d.prop}: ${d.value}` : `${minP[0]}: ${minC}`}`); return; }
      if (cap === "content") {
        // the child that reaches furthest names the limit; its own inline size is lit when it was resized
        const er = el.getBoundingClientRect();
        const child = [...el.children].filter((c) => !helper(c)).sort((a, b) => { const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(); return x ? rb.right - ra.right : rb.bottom - ra.bottom; })[0];
        const d = child ? this.store.models.find((m) => m.inlineEl === child)?.decls.find((k) => k.type === "decl" && k.on && k.prop === (x ? "inline-size" : "block-size")) || null : null;
        this.setBlocked(d, `held by content${child ? `: ${name(child)}` : ""}`, child || null);
        return;
      }
      if (cap) {
        const d = cap === "grid" ? find(above, x ? ["grid-template-columns", "grid-auto-columns", "grid-template", "grid"] : ["grid-template-rows", "grid-auto-rows", "grid-template", "grid"]) : find(above, x ? ["width", "inline-size", "max-width", "max-inline-size"] : ["height", "block-size", "max-height", "max-block-size"]);
        if (cap === "grid") { this.setBlocked(d, `grid track${d ? `: ${d.value}` : ""}`, parent); return; }
        if (d) { this.setBlocked(d, `${name(parent)}: ${d.prop}: ${d.value}`, parent); return; }
        // the parent has no width rule: it is sized by its own parent's layout (a grid or flex that centres it) or by its content
        const gp = parent?.parentElement, gcs = gp ? getComputedStyle(gp) : null;
        if (gcs && /grid/.test(gcs.display)) {
          const g = this.declaredOn(gp, ["place-items", "justify-items"]) || this.declaredOn(parent, ["justify-self", "place-self"]) || this.declaredOn(gp, ["display"]);
          this.setBlocked(g, `${name(gp)} grid${g ? `: ${g.prop}: ${g.value}` : ""}`, parent); return;
        }
        if (gcs && /flex/.test(gcs.display)) {
          const g = this.declaredOn(parent, ["flex", "flex-grow"]) || this.declaredOn(gp, ["display"]);
          this.setBlocked(g, `${name(gp)} flex${g ? `: ${g.prop}: ${g.value}` : ""}`, parent); return;
        }
        this.setBlocked(null, `${name(parent)}: content-sized`, parent); return;
      }
      const max = x ? ["max-width", "max-inline-size"] : ["max-height", "max-block-size"], min = x ? ["min-width", "min-inline-size"] : ["min-height", "min-block-size"];
      const size = x ? ["width", "inline-size"] : ["height", "block-size"];
      const maxV = x ? cs.maxWidth : cs.maxHeight, minV = x ? cs.minWidth : cs.minHeight;
      let d = null, note = "";
      if (maxV !== "none" && got < want && Math.abs(num(maxV) + (cs.boxSizing === "content-box" ? (x ? num(cs.paddingLeft) + num(cs.paddingRight) + num(cs.borderLeftWidth) + num(cs.borderRightWidth) : num(cs.paddingTop) + num(cs.paddingBottom) + num(cs.borderTopWidth) + num(cs.borderBottomWidth)) : 0) - got) <= 1) { d = find(own, max); note = d ? `${d.prop}: ${d.value}` : `${max[0]}: ${maxV}`; }
      else if (minV !== "auto" && num(minV) > 0 && got > want) { d = find(own, min); note = d ? `${d.prop}: ${d.value}` : `${min[0]}: ${minV}`; }
      else if ((d = find(own, size)) && d.important) note = `${d.prop}: ${d.value} !important`;
      else if (cs.display === "inline") { d = find(own, ["display"]); note = "display: inline"; }
      else if (flex && (row === x)) { const grow = num(cs.flexGrow), shrink = num(cs.flexShrink); d = find(own, got < want ? ["flex-shrink", "flex"] : ["flex-grow", "flex"]); note = d ? `${d.prop}: ${d.value}` : got < want && shrink ? `flex-shrink: ${shrink}` : got > want && grow ? `flex-grow: ${grow}` : "the flex container"; if (!d) d = find(above, ["display"]); }
      else if (grid) { d = find(above, x ? ["grid-template-columns", "grid-auto-columns"] : ["grid-template-rows", "grid-auto-rows"]); note = d ? `${d.prop}: ${d.value}` : "the grid track"; }
      else if (/absolute|fixed/.test(cs.position) && (x ? cs.left !== "auto" && cs.right !== "auto" : cs.top !== "auto" && cs.bottom !== "auto")) { d = find(own, x ? ["left", "right", "inset", "inset-inline"] : ["top", "bottom", "inset", "inset-block"]); note = d ? `${d.prop}: ${d.value}` : "both insets"; }
      else { d = null; note = ""; }
      if (note) { this.setBlocked(d, `held by ${note}`); return; }
    }
  }

  setBlocked(d, text, area = null) {
    // The row that kept the size: lit red in the CSS tab (and brought into view, the tab opened for it); the reason is spoken to assistive tech.
    // The element's own rule first (the row alone says it); when the hold came from outside, the holding AREA is framed on the page with the reason:
    // the parent (content-sized, a grid track, its own width rule, the grandparent's grid or flex) or the child whose content reaches furthest
    const was = this.blocked;
    this.blocked = d; this.wblock.textContent = text; this.heldArea = text ? area : null;
    if (was) this.syncRow(was);
    if (d) {
      this.syncRow(d);
      // the row is brought into view: the CSS tab opens for it when the HTML tab was showing
      if (this.hasAttribute("open") && this.views.css.hidden) { this.fold(false); this.show("css"); }
      const row = this.rowOf.get(d)?.row;
      if (row && !this.views.css.hidden) row.scrollIntoView({ block: "center" });
    }
  }

  chooseSize(el) {
    // The chosen element: the corner handle moves onto it, the top bar reads its size
    this.setBlocked(null, "");
    this.sizeTarget = el;
    this.handle.setAttribute("data-on", "");
    this.paint();
  }

  sizeHandle(handle) {
    // Dragging the handle writes the element's size as inline px (a border-box size, whatever its box-sizing); the block size follows the content.
    // A parent always wins: children resized earlier are narrowed with it, as one undo step. Left/Right arrows on the focused handle step by 1px (Shift: 10)
    handle.addEventListener("pointerdown", (e) => {
      const el = this.sizeTarget;
      if (e.button !== 0 || !el || !this.resizeSupported(el)) return;
      e.preventDefault(); e.stopPropagation();
      if (this.editor && !this.editor.finish(false)) this.editor.finish(true);
      const from = { x: e.clientX, w: el.getBoundingClientRect().width };
      const session = this.resizeStart(el);
      let want = from.w;
      this.gesture(e, (event) => {
        want = Math.max(1, from.w + event.clientX - from.x);
        this.resizeWidth(session, want);
        if (!this.sizeDrag) return;
        // The warning comes up the moment the drag meets a limit, and goes the moment it leaves it
        const held = this.sizeCap.x || Math.abs(el.getBoundingClientRect().width - want) > 1, now = performance.now();
        if (held && (!this.wblock.textContent || now - (this.explainedAt || 0) > 200)) { this.explainedAt = now; this.explainSize(el, want); }
        else if (!held && this.wblock.textContent) this.setBlocked(null, "");
      }, (_, cancelled) => {
        this.finishResize(session, cancelled);
        this.suppressClick();
        if (!cancelled && el.isConnected) this.explainSize(el, want);
      });
    });
    handle.addEventListener("keydown", (e) => {
      const el = this.sizeTarget;
      if (!["ArrowLeft", "ArrowRight"].includes(e.key) || !el || !this.resizeSupported(el)) return;
      e.preventDefault(); e.stopPropagation();
      const session = this.resizeStart(el);
      const want = Math.max(1, el.getBoundingClientRect().width + (e.key === "ArrowRight" ? 1 : -1) * (e.shiftKey ? 10 : 1));
      this.resizeWidth(session, want);
      this.finishResize(session, false);
      this.explainSize(el, want);
    });
  }

  resizeStart(el) {
    // One resize session: the element, the children resized earlier (narrowed with it), their drag-start attributes, the layout's limits
    if (!this.sized.has(el)) this.sized.set(el, el.getAttribute("style"));
    const cs = getComputedStyle(el);
    const kids = [...this.sized.keys()].filter((kid) => kid !== el && el.contains(kid) && kid.isConnected);
    const before = new Map([el, ...kids].map((node) => [node, node.getAttribute("style")]));
    const extra = cs.boxSizing === "content-box" ? num(cs.paddingLeft) + num(cs.paddingRight) + num(cs.borderLeftWidth) + num(cs.borderRightWidth) : 0;
    this.sizeCap = { x: null, y: null };
    this.sizeDrag = el; this.setAttribute("resizing", "");
    return { el, kids, before, extra, limit: this.sizeLimits(el, cs) };
  }

  resizeWidth(session, desired) {
    // One step: the layout's rules hold (never past the parent's content box, never past a grid track; the handle may ask, the element stays inside),
    // and never narrower than its own content: the children stay inside (an element that clips or scrolls its overflow is its own rule);
    // the children resized earlier start each step from their drag-start size, so a step that narrowed them is undone by a wider one
    const { el, kids, before, extra, limit } = session;
    if (!el.isConnected || helper(el)) { this.cancelResize(); return; }
    if (!this.resizeSupported(el)) { this.cancelResize(); this.setBlocked(null, "transformed: edit the CSS value instead"); return; }
    let w = Math.max(1, desired);
    this.sizeCap = { x: null, y: null };
    if (w > limit.w) { w = limit.w; this.sizeCap.x = limit.whyW; }
    if (this.writeSize(el, Math.round(w - extra))) this.sizeCap.x ||= "parent";
    const over = limit.parent ? this.overflow(el, limit.parent) : null;
    if (over?.x > 0.5) { this.writeSize(el, Math.max(1, Math.round(w - over.x - extra))); this.sizeCap.x ||= "parent"; }
    for (let pass = 0; ; pass++) {
      for (const kid of kids) this.restoreSize(kid, before.get(kid));
      this.crush(el, kids);
      const need = this.contentNeed(el);
      if (need.x <= 1 || pass === 4) break; // scrollWidth is an integer (Firefox rounds both sides): a 1px "need" at the edge is rounding, not content
      this.writeSize(el, Math.round(el.getBoundingClientRect().width + need.x - extra), false); this.sizeCap.x = "content";
    }
    this.paint();
  }

  finishResize(session, cancelled) {
    // A cancelled session puts the size properties back; a finished one records what changed as one undo entry
    // A step's "after" is the tool's own last write, so a size the page wrote between the last move and the release is not undone as if it were the tool's
    if (cancelled) for (const [node, attr] of session.before) this.restoreSize(node, attr, this.wrote.get(node)?.prop);
    else {
      const steps = [...session.before].filter(([node, attr]) => node.isConnected && node.getAttribute("style") !== attr)
        .map(([node, attr]) => ({ el: node, before: attr, after: this.wrote.get(node)?.attr ?? node.getAttribute("style"), prop: this.wrote.get(node)?.prop }));
      if (steps.length) this.sizeRecord(steps);
    }
    this.sizeDrag = null; this.removeAttribute("resizing");
    this.htmlDirty = true; this.queueLoad(); this.paint();
  }

  sizeReset(el, record = true) {
    // The handle's Reset: this element's size back to its own style attribute, as one undo step
    this.cancelResize();
    if (!el || !this.sized.has(el)) return;
    this.setBlocked(null, "");
    const before = el.getAttribute("style"), prop = this.wrote.get(el)?.prop;
    if (this.pageSized(el)) { this.sized.delete(el); this.wrote.delete(el); this.setBlocked(null, "resize skipped: the page changed it"); } // the page's size stands, the element is its own again
    else {
      this.restoreSize(el, this.sized.get(el), prop);
      this.sized.delete(el);
      if (record && el.getAttribute("style") !== before) this.sizeRecord([{ el, before, after: el.getAttribute("style"), prop }]);
    }
    this.htmlDirty = true; this.queueLoad(); this.paint();
  }

  restoreStyle(el, attr) { if (attr == null) el.removeAttribute("style"); else el.setAttribute("style", attr); }

  sizeRecord(steps) {
    // One undo entry: the elements a drag touched, the parent and the children it narrowed
    this.sizeHistory.push(steps);
  }

  sizeUndo() {
    // The top bar's undo: the last resize back, the children it narrowed and the handle's Reset included.
    // A step whose size the page has written since (another value, another priority) is skipped: the page's write stands
    this.cancelResize();
    const entry = this.sizeHistory.pop();
    if (!entry) return;
    this.setBlocked(null, "");
    let skipped = 0;
    for (const step of [...entry].reverse()) {
      if (!step.el.isConnected || helper(step.el)) { skipped++; continue; }
      const now = this.sizeOf(step.el, step.el.getAttribute("style"), step.prop), expected = this.sizeOf(step.el, step.after, step.prop);
      if (now.value !== expected.value || now.priority !== expected.priority) { skipped++; continue; }
      if (!this.sized.has(step.el)) this.sized.set(step.el, step.after); // undone past its Reset: the current attribute is what Reset returns to
      this.restoreSize(step.el, step.before, step.prop);
      if (step.el.getAttribute("style") === this.sized.get(step.el)) this.sized.delete(step.el);
    }
    if (skipped) this.setBlocked(null, `${skipped} resize${skipped === 1 ? "" : "s"} skipped: the page changed it`);
    this.htmlDirty = true; this.queueLoad(); this.paint();
  }

  sizeResetAll() {
    // The top bar's Reset all: every resized element back to its own size, the history cleared
    this.cancelResize();
    let skipped = 0;
    for (const [el, attr] of this.sized) { if (this.pageSized(el)) skipped++; else this.restoreSize(el, attr, this.wrote.get(el)?.prop); }
    this.sized.clear(); this.sizeHistory.clear();
    if (skipped) this.setBlocked(null, `${skipped} resize${skipped === 1 ? "" : "s"} skipped: the page changed it`);
    this.htmlDirty = true; this.queueLoad(); this.paint();
  }

  paintHold(el, chrome) {
    // The area that held the resize: a red dashed frame with the reason on a red chip (the name chip's spots, never over a control)
    const { r } = this.painter.geometry(el);
    this.painter.box("dbox", r.left, r.top, r.width, r.height);
    this.painter.chip(this.painter.label("hold", this.wblock.textContent, 0, 0), r, chrome);
  }

  paintSizer(el) {
    // The chosen element: its frame, the handle on its bottom-right corner (kept reachable inside the viewport), its live size in the top bar
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
    // the Reset sits right of the handle, or left of it against the viewport's edge, only once the element has been resized
    const reset = this.hresetBtn, w = reset.offsetWidth || 50, h = reset.offsetHeight || 20, gap = half + 6;
    reset.toggleAttribute("data-on", this.sized.has(el));
    reset.style.left = `${Math.max(4, hx + gap + w > innerWidth - 4 ? hx - gap - w : hx + gap)}px`;
    reset.style.top = `${Math.max(4, Math.min(hy - h / 2, innerHeight - h - 4))}px`;
  }

  pickTarget(event) {
    const path = event.composedPath();
    if (!path.includes(this.pickSurface)) return path.includes(this) ? null : event.target;
    // Temporarily exclude only the transparent shield from hit testing.
    this.pickSurface.style.pointerEvents = "none";
    const point = event.touches?.[0] || event.changedTouches?.[0] || event;
    try { return document.elementsFromPoint(point.clientX, point.clientY).find((el) => !helper(el)) || null; } // through an extension's overlay
    finally { this.pickSurface.style.pointerEvents = ""; }
  }

  setPicking(on) {
    if (on === this.picking) return;
    this.picking = on;
    this.pickBtn.setAttribute("aria-pressed", String(on));
    this.toggleAttribute("picking", on);
    if (on) this.tools.arm("picking");
    else {
      this.alt = false;
      this.clearPicks(); // like the ruler: what the picker marked goes when it closes; the resize tool's state stands
      this.tools.end("picking");
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
    if (this.sizing && this.sizeTarget) list.push({ el: this.sizeTarget, size: true });
    if (this.sizing && this.heldArea?.isConnected && this.wblock.textContent) list.push({ el: this.heldArea, hold: true }); // the area that held the last resize
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
      if (this.htmlDirty && this.loaded && this.hasAttribute("open") && !this.views.html.hidden && !this.editor && !this.sizeDrag) this.loadHtml();
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
      if (m.model) this.paintModel(m.el, m.hue, chrome);
      else if (m.probe) this.paintProbe(m.el, chrome);
      else if (m.dist) this.paintDistance(this.focusEl, m.el, chrome);
      else if (m.measure) this.paintMeasure(m.el, chrome);
      else if (m.size) this.paintSizer(m.el);
      else if (m.hold) this.paintHold(m.el, chrome);
      else this.paintDecl(m.el, m.decl, chrome);
    }
    this.painter.end(); this.reachCache = null;
  }

  paintModel(el, hue, chrome) {
    // A picked element: its frame, the width and height lines with their sizes, the name chip in its hue;
    // the last pick also draws the guide lines across the viewport
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
    // The element under the picker: its frame, the width and height lines with their sizes, the name chip
    const r = this.painter.geometry(el).r;
    this.painter.box("box", r.left, r.top, r.width, r.height);
    this.painter.chip(this.painter.label("", this.painter.chipParts(el, r, false), 0, 0), r, chrome);
    this.painter.dims(r, chrome);
  }

  paintMeasure(el, chrome) {
    // The ruler: the frame, one DevTools-style chip (name | W × H) and the margin, border and padding bands with their values where they are non-zero;
    // no measure lines, they drowned the page when every element wore them
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
    // The room a block-level box leaves beside itself in a block container (the card's img at 299px in a 536px content box): hatched, with its width
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

  paintDistance(from, to, chrome) {
    // Alt while picking: the gap between the last pick and the element under the pointer, along the nearest side
    const a = from.getBoundingClientRect(), b = to.getBoundingClientRect();
    this.painter.box("dbox", b.left, b.top, b.width, b.height);
    let line = null, gap = 0, chipX, chipY;
    const mid = (lo1, hi1, lo2, hi2) => { const lo = Math.max(lo1, lo2), hi = Math.min(hi1, hi2); return lo < hi ? (lo + hi) / 2 : (lo1 + hi1) / 2; };
    if (b.left >= a.right) { gap = b.left - a.right; const y = mid(a.top, a.bottom, b.top, b.bottom); line = this.painter.box("dln", a.right, y, gap, 1); chipX = a.right + gap / 2; chipY = y; }
    else if (b.right <= a.left) { gap = a.left - b.right; const y = mid(a.top, a.bottom, b.top, b.bottom); line = this.painter.box("dln", b.right, y, gap, 1); chipX = b.right + gap / 2; chipY = y; }
    else if (b.top >= a.bottom) { gap = b.top - a.bottom; const x = mid(a.left, a.right, b.left, b.right); line = this.painter.box("dln", x, a.bottom, 1, gap); chipX = x; chipY = a.bottom + gap / 2; }
    else if (b.bottom <= a.top) { gap = a.top - b.bottom; const x = mid(a.left, a.right, b.left, b.right); line = this.painter.box("dln", x, b.bottom, 1, gap); chipX = x; chipY = b.bottom + gap / 2; }
    if (line) this.painter.label("dch", fmt(gap), chipX, chipY);
    this.painter.chip(this.painter.label("", this.painter.chipParts(to, b), 0, 0), b, chrome);
  }

  paintDecl(el, d, chrome) {
    // A hovered or pinned declaration: where its rule lands, with the band or size it sets; no name chip
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
    // Every stylesheet, every rule, in source order; the last pick's matching rules are then lit in place
    const view = this.views.css;
    view.replaceChildren();
    this.hover = null; // the hovered row is gone with the old view
    this.rowOf = new Map();
    this.groups = []; // { node, el }: each rendered rule and its group box
    if (!this.store.sheets.length && !this.store.inlineNodes?.length) { view.append(this.note("No stylesheet on this page.")); return; }
    for (const s of this.store.sheets) {
      if (this.store.sheets.length > 1) view.append(this.comment(`/* ${s.name} */`));
      if (s.unread) { view.append(this.comment("/* stylesheet could not be read */")); continue; }
      this.render(view, s.nodes, 0);
    }
    // An element's inline style="" sits right above the first rule that selects it, in its own colour; with no such rule it leads the list
    for (const n of this.store.inlineNodes || []) {
      const el = n.model.inlineEl;
      const matches = this.groups.filter((x) => x.node !== n && x.node.model && !x.node.model.inlineEl && this.store.matchModel(x.node.model, [el]).length > 0);
      const first = matches.find((x) => !/^\*/.test(x.node.model.selector || "")) || matches[0]; // past the universal resets, like scrollToHit
      const g = this.group(n, { depth: 0 });
      g.classList.add("inline");
      if (first) first.el.before(g); else view.prepend(g);
    }
    this.markHits();
  }

  markHits() {
    // The groups whose rule selects the last pick wear its hue; the others stand as they are
    const el = this.focusEl, hue = el ? this.picks.get(el)?.hue : null;
    for (const { node, el: g } of this.groups || []) {
      let hit = false;
      if (el && node.model) hit = this.store.matchModel(node.model, [el]).length > 0;
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
    head.append(span("sel", n.head));
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
          head.append(span("sel", n.head));
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
      row.append(span("t", text));
      return row;
    }
    const box = document.createElement("input");
    box.type = "checkbox";
    box.checked = d.on;
    box.setAttribute("aria-label", `${d.prop}: ${d.value}`);
    box.addEventListener("change", () => {
      const before = this.state(d);
      d.on = box.checked; this.apply(d); this.syncRow(d);
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
      if (on) this.pins.add(d); else this.pins.delete(d);
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
    value.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); this.edit(d); } });
    row.addEventListener("pointerenter", () => { this.hover = d; this.paint(); });
    row.addEventListener("pointerleave", () => { this.hover = null; this.paint(); });
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
    r.row.classList.toggle("block", d === this.blocked);
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
    const start = d.value, startOn = d.on;
    const model = d.model, startText = model.rule.style.cssText;
    const startAttribute = model.inlineEl?.getAttribute("style") ?? null;
    const cancelStyle = this.store.scratch(model, startText);
    let editorWrite = startText;
    const absorbOutside = () => {
      const live = model.rule.style.cssText;
      for (const { prop, value, priority } of this.store.styleChanges(this.store.scratch(model, editorWrite), this.store.scratch(model, live))) {
        this.store.writeProperty(cancelStyle, prop, value, priority);
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
    const keys = new AbortController(); // the window-level Escape, gone with the edit
    const finish = (cancel, restoreFocus = false) => {
      if (finished) return true;
      if (!cancel && !validate()) {
        if (restoreFocus) field.focus();
        return false;
      }
      finished = true; keys.abort();
      if (!cancel && (d.value !== start || d.on !== startOn)) this.record([{ d, before: { value: start, on: startOn, important: d.important }, after: this.state(d) }]);
      if (cancel) {
        absorbOutside();
        this.store.rebaseBaseline(model);
        if (model.inlineEl && cancelStyle.cssText === startText) {
          if (startAttribute == null) model.inlineEl.removeAttribute("style");
          else model.inlineEl.setAttribute("style", startAttribute);
        } else model.rule.style.cssText = cancelStyle.cssText;
        d.value = start; d.on = startOn;
        const originally = this.store.scratch(model, startText);
        if (startOn && (originally.getPropertyValue(d.prop) !== cancelStyle.getPropertyValue(d.prop) || originally.getPropertyPriority(d.prop) !== cancelStyle.getPropertyPriority(d.prop))) {
          d.value = cancelStyle.getPropertyValue(d.prop) || start;
          d.on = cancelStyle.getPropertyValue(d.prop) !== "";
          d.important = cancelStyle.getPropertyPriority(d.prop) === "important";
        }
        model.sourceText = this.store.scratch(model, this.store.declarationText(model)).cssText;
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
    if (!value || !this.store.validValue(d, value)) return false;
    d.value = value; d.on = true; this.apply(d); return true;
  }

  apply(d) {
    this.store.write(d);
    for (const entry of d.model.decls) if (entry.type === "decl") this.syncRow(entry);
    this.markHits(); this.paint();
  }

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
    this.setPicking(false);
    this.setSizing(false);
    this.setMeasuring(false);
    this.sizeResetAll();
    this.reset();
    this.clearMarks();
  }

  clearPicks() {
    // Every picked element off the page and out of the HTML rows
    for (const [, p] of this.picks) { this.setPickedRow(p.row, false); p.row.style.removeProperty("--accent"); }
    this.picks.clear();
    this.focusEl = null;
    this.markHits();
    this.paint();
  }

  clearMarks() {
    // Every pick and pin off the page and out of the rows; the CSS edits stay
    this.clearPicks();
    this.pins.clear();
    this.hover = null;
    this.markHits();
    for (const r of this.rowOf.values()) { r.row.classList.remove("on"); r.row.querySelector(".t")?.setAttribute("aria-pressed", "false"); }
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
