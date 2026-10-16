import STYLE from "./style.css";
import { MARKUP } from "./markup.js";
import { num, fmt, name, span, sizeRows, PALETTE } from "./util.js";
import { sizeLadder } from "./tools/size-explain.js";
import { Painter } from "./overlay/painter.js";
import { paintModel, paintProbe, paintMeasure, paintDistance, paintDecl } from "./overlay/draw.js";
import { CssStore } from "./css/model.js";
import { History } from "./history.js";
import { Tools } from "./tools.js";
import { Resizer } from "./tools/resize.js";
import { Picker } from "./tools/picker.js";
import { Lens } from "./tools/lens.js";
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
      onSwitch: (id) => this.solo(id), // one tool at a time: the others off, the box closed
      pickTarget: (event) => this.pickTarget(event),
      isHelper: helper,
      editing: () => !!this.editor || this.second, // an open edit, or the second box: Escape takes it first, the tool ends on the next
      cancelEdit: () => { if (this.editor) this.editor.finish(true, true); else this.closeSecond(); },
      say: (text) => { this.stateText.textContent = text; },
      busy: () => !!this.cancelGesture, // a gesture of the box's own is running
    });
    this.hresetBtn = $(".hreset");
    this.painter = new Painter($(".ov"));
    this.resize = new Resizer({
      host: this,
      els: { btn: this.sizeBtn, handle: this.handle, wval: this.wval, wnow: $(".wnow"), wblock: this.wblock, hreset: this.hresetBtn },
      tools: this.tools,
      painter: this.painter,
      get store() { return self.store; },
      paint: () => this.paint(),
      goTo: (el, d) => this.openSecond(el, d),
      toggleDecl: (d, on) => { const before = this.state(d); d.on = on; this.cssView.apply(d); this.cssView.syncRow(d); this.record([{ d, before, after: this.state(d) }]); }, // the holding declaration's tick, from the resize view
      box: (on) => { // the resize tool's own box: the first choice opens it on the size view, the tool's end closes it
        if (on) { this.show("size"); if (!this.hasAttribute("open")) this.toggle(true); this.avoidResizeHandle(); }
        else if (this.view === "size" && this.hasAttribute("open")) this.toggle(false);
      },
      queueLoad: () => this.queueLoad(),
      dirtyHtml: () => { this.htmlDirty = true; },
      syncRow: (d) => this.syncRow(d),
      revealRow: (d) => {
        // the row is brought into view: the CSS view opens for it when the HTML view was showing; the resize tool's own view stays, the reason reads there
        if (this.hasAttribute("open") && this.views.css.hidden && this.view !== "size") this.show("css");
        const row = this.rowOf.get(d)?.row;
        if (row && !this.views.css.hidden) row.scrollIntoView({ block: "center" });
      },
      gesture: (e, move, done) => this.gesture(e, move, done),
      suppressClick: () => this.suppressClick(),
      cancelGesture: () => this.cancelGesture?.(),
      finishEdit: () => { if (this.editor && !this.editor.finish(false)) this.editor.finish(true); },
    });
    this.hresetBtn.addEventListener("click", () => { this.resize.reset(this.resize.target); this.editor?.finish(true); this.reset(); this.resize.setBlocked(null, ""); }); // this element's size back AND every CSS edit back; picks and pins stay
    this.measuring = false; // the ruler: every element's frame, sizes and bands at once
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
    this.mode = { html: "scope", css: "scope" }; // per view: the chosen element alone, or everything
    this.resetBtn = $(".reset");
    this.history = new History(() => {}); // CSS changes, newest last: a tick, an edit session or a Reset (a batch), each as the rows' states before and after; its button comes with the CSS box's own controls
    this.status = $(".status");
    this.pickSurface = $(".pick-surface");
    this.views = { html: $("#view-html"), css: $("#view-css"), quick: $("#view-quick"), size: $("#view-size") };
    this.panel2 = $("#panel2"); this.p2body = this.panel2.querySelector(".body"); this.p2title = $(".p2title"); this.second = false; // the second box: the CSS view, opened from a hold
    $(".p2close").addEventListener("click", () => this.closeSecond());
    this.panel2.querySelector(".head").addEventListener("pointerdown", (e) => { // the second box drags by its head, itself
      if (e.button !== 0 || this.phone() || e.target.closest("button")) return;
      e.preventDefault();
      const r = this.panel2.getBoundingClientRect(), from = { x: e.clientX, y: e.clientY, left: r.left, top: r.top };
      this.gesture(e, (event) => this.placeSecond(from.left + event.clientX - from.x, from.top + event.clientY - from.y), () => {});
    });
    this.picker = new Picker({
      host: this, btn: this.pickBtn, tools: this.tools,
      rows: () => this.htmlView.rows,
      loadHtml: () => this.loadHtml(),
      setPickedRow: (row, on) => this.htmlView.setPickedRow(row, on),
      openCssFor: (el) => { this.htmlView.reveal(el); this.openView("css", true); this.scrollToHit(); },
      markHits: () => this.markHits(),
      paint: () => this.paint(),
      quick: (on, el) => { // the quick view's own box: a page click opens it on that element, the tool's end closes it
        if (on) { this.quickEl = el; this.show("quick"); if (!this.hasAttribute("open")) this.toggle(true); this.renderQuick(el, true); this.paint(); }
        else { this.quickEl = null; this.quickKey = null; if (this.view === "quick" && this.hasAttribute("open")) this.toggle(false); }
      },
    });
    this.lens = new Lens({
      host: this,
      btn: (which) => (which === "html" ? this.htmlBtn : this.cssBtn),
      tools: this.tools,
      crosshair: (on) => this.picker.crosshair(on),
      probe: (el) => this.picker.setProbe(el),
      paint: () => this.paint(),
      show: (which, el) => {
        // the chosen element's code in the box: a new choice shows the element alone
        this.mode[which] = "scope";
        this.applyScope(which);
        this.openView(which, true);
        if (which === "css") this.scrollToHit();
      },
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
      sizeExtra: (el) => this.contentRows(el), // the quick view's content / rendered content / space / with margin lines, for Show Size's element box
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

    // a lens icon arms its tool; the armed icon pressed again lets go and closes the box
    for (const which of ["html", "css"]) this.lens.ui.btn(which).addEventListener("click", () => {
      if (this.lens.armed === which) { this.lens.arm(which, false); if (this.hasAttribute("open")) this.toggle(false); } else this.lens.arm(which);
    });
    this.closeBtn.addEventListener("click", () => this.toggle(false));
    this.scopeBtn.addEventListener("click", () => {
      // the element itself: a lit CSS block or HTML context lets go, and the mode is the chosen element
      let back = false;
      if (this.view === "css") for (const k of ["limits", "cascade", "defaults", "overrides", "initials"]) if (this.cssView[k]) { this.cssView[k] = false; back = true; }
      if (this.view === "html" && this.htmlView.around) { this.htmlView.around = null; this.htmlView.rows = new Map(); back = true; }
      if (this.mode[this.view] === "scope") { if (!back) return; this.syncMode(); if (this.view === "css") this.cssView.render(); else { this.htmlDirty = true; if (this.loaded) this.loadHtml(); } return; }
      this.setMode(this.view, "scope");
    });
    this.allBtn.addEventListener("click", () => this.setMode(this.view, "all"));
    // The four CSS blocks are one pick: a press shows that block alone (the others fold), a second press on the lit one folds it too
    for (const [btn, key] of [[this.limitsBtn, "limits"], [this.cascadeBtn, "cascade"], [this.defaultsBtn, "defaults"], [this.renderBtn, "overrides"], [this.initialsBtn, "initials"]]) {
      btn.addEventListener("click", () => {
        const on = !this.cssView[key];
        for (const k of ["limits", "cascade", "defaults", "overrides", "initials"]) this.cssView[k] = k === key && on;
        this.syncMode();
        if (this.loaded) this.cssView.render();
      });
    }
    // The HTML view's three contexts are one pick the same way: the element with its parent, its children or its siblings
    for (const [key, btn] of Object.entries(this.aroundBtns)) {
      btn.addEventListener("click", () => {
        this.htmlView.around = this.htmlView.around === key ? null : key;
        this.htmlView.rows = new Map(); // the context's own folds, not the last view's
        this.syncMode();
        this.htmlDirty = true; if (this.hasAttribute("open") && this.view === "html" && this.loaded) this.loadHtml();
      });
    }
    this.resetBtn.addEventListener("click", () => this.resetAll());
    this.byeBtn.addEventListener("click", () => this.dismiss());
    this.pickBtn.addEventListener("click", () => this.setPicking(!this.picking));
    this.measureBtn.addEventListener("click", () => this.setMeasuring(!this.measuring));
    this.sizeBtn.addEventListener("click", () => this.setSizing(!this.sizing));
    this.head.title = "Drag to move";
    root.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.second) { e.preventDefault(); this.closeSecond(); return; } // the second box first
      if (e.key === "Escape" && this.hasAttribute("open")) { e.preventDefault(); this.toggle(false); }
    });
    // A right click on the page with no tool armed closes the open box, like Escape; with the box closed too the browser's menu opens as ever
    // A right click anywhere on the page closes whatever stands, at once: the armed tools, the ruler and the open box; with nothing standing the page's menu opens
    this.onContextMenu = (e) => {
      const path = e.composedPath();
      if (path.includes(this) && !path.includes(this.pickSurface)) return; // the box and the rail keep their own menus; the pick surface IS the page under a tool
      if (!this.tools.active && !this.measuring && !this.hasAttribute("open")) return;
      e.preventDefault(); e.stopImmediatePropagation();
      this.closeAll();
    };
    // A drag that moved the box must not count as a click on what it started over
    root.addEventListener("click", (e) => { if (this.dragged) { e.stopPropagation(); e.preventDefault(); } }, true);
    this.draggable(this.head);
    this.sheetDrag(this.head);
    this.foldable(this.head, this.panel); this.foldable(this.panel2.querySelector(".head"), this.panel2); // a still click on a head's bare part folds the box to its head, the next unfolds it
    root.querySelectorAll(".rz").forEach((h) => this.resizable(h));
    this.onResize = () => { this.fit(); this.markHits(); this.paint(); };
    this.panelRo = new ResizeObserver(this.onResize);
    this.show("html");
    this.connect();
    readSource().then(() => { if (this.loaded) { this.htmlDirty = true; this.queueLoad(); } });
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
      if (!this.loaded || (!this.hasAttribute("open") && !this.pins.size && !this.picking && !this.sizing && !this.measuring && !this.lens.armed)) return;
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
    if (this.lens.armed) this.lens.arm(this.lens.armed, false);
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
    if (this.lens.prune(helper)) { this.applyScope("html"); this.applyScope("css"); }
  }

  gesture(e, move, done, capture = true) {
    // Window listeners follow the pointer; capture is taken at once, or later through the returned grab()
    // (a press on a button must not be captured before it moves: a captured click lands on the handle, not the button)
    this.cancelGesture?.();
    const ctrl = new AbortController(), target = e.currentTarget, id = e.pointerId;
    let ended = false, grabbed = false;
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
    target.addEventListener("lostpointercapture", (event) => { if (grabbed && event.target === target) end(event, true); }, options); // a capture this gesture never took (the one a stale gesture let go a moment ago) is not its end
    const grab = () => { if (!ended) try { target.setPointerCapture(id); grabbed = true; } catch { /* Window listeners still cover the gesture. */ } };
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

  foldable(head, panel) {
    // A click on the head itself (not a button, not a drag, not a phone sheet) folds the box down to its head, the next click raises it
    head.addEventListener("click", (e) => {
      if (this.phone() || this.dragged || e.target.closest("button, input, a")) return;
      panel.toggleAttribute("data-folded");
      this.paint(); // the labels take the box's new height into account
    });
  }

  avoidResizeHandle() {
    // Only a new resize choice moves the box; a user's subsequent drag keeps its own position.
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
    const spots = [[area.left - p.width - 8, p.top], [area.right + 8, p.top], [p.left, area.top - p.height - 8], [p.left, area.bottom + 8], [8, 8]]
      .map(([left, top]) => [Math.max(8, Math.min(left, maxLeft)), Math.max(8, Math.min(top, maxTop))])
      .filter(([left, top]) => !overlaps(left, top))
      .sort((a, b) => Math.hypot(a[0] - p.left, a[1] - p.top) - Math.hypot(b[0] - p.left, b[1] - p.top));
    if (spots.length) this.moveTo(innerWidth - spots[0][0] - p.width, spots[0][1]);
  }

  phone() { return matchMedia("(max-width: 480px)").matches; }

  sheetDrag(handle) {
    // Phones: pulling the head down shrinks the sheet and it stays there, down to the head alone; pushing up grows it to half the screen.
    // Only the close button closes the sheet; a double tap on the head drops it to the head and raises it again
    handle.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || !this.phone() || e.target.closest("input, a")) return;
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
      if (e.button !== 0 || this.phone()) return;
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
    // Resizes keeping the top-right pin; against a screen edge the box slides away so it can still grow
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

  dismiss() {
    this.resetAll();
    this.dispose();
    this.remove();
  }

  applyScope(which) {
    // The view's scope from the lens's choice and the box's mode: the element alone, or everything
    const el = this.mode[which] === "all" ? null : this.lens.scope[which];
    if (which === "html") { this.htmlView.scope = el; this.htmlDirty = true; if (this.hasAttribute("open") && this.view === "html" && this.loaded) this.loadHtml(); }
    else { this.cssView.scope = el; if (this.loaded) this.cssView.render(); }
    if (this.view === which) this.syncMode();
  }

  setMode(which, mode) {
    if (this.mode[which] === mode) return;
    this.mode[which] = mode;
    this.applyScope(which);
    this.paint();
  }

  syncMode() {
    // The box's controls read the showing view: the mode (the selected element needs a chosen one), the CSS blocks, the HTML contexts
    const chosen = !!this.lens.scope[this.view], scope = this.mode[this.view] === "scope" && chosen;
    this.scopeBtn.hidden = this.allBtn.hidden = this.view === "quick" || this.view === "size"; // the quick view and the resize view have no scope: the one follows the pointer, the other the chosen element
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
    // A rail icon opens its box with its view, and closes the box when that view already shows (keep: never close, a pick's doorway)
    if (this.hasAttribute("open") && this.view === which) { if (!keep) this.toggle(false); return; }
    this.show(which);
    if (!this.hasAttribute("open")) this.toggle(true);
  }

  toggle(open) {
    if (!open && this.editor && !this.editor.finish(false)) this.editor.finish(true);
    if (!open && this.second) this.closeSecond(false); // the second box goes with the first
    this.anchor();
    this.toggleAttribute("open", open);
    if (!open) this.panel.removeAttribute("data-folded"); // a closed box reopens whole
    this.fit();
    this.show(this.view || "html");
    if (open) { this.load(); this.panel.focus(); } // the focus moves into the box: Escape closes it, Tab reaches its rows
    else {
      this.panel.style.removeProperty("--sheet"); // a phone sheet reopens at its full height
      if (this.panel.contains(this.shadowRoot.activeElement)) (this.view === "css" ? this.cssBtn : this.view === "quick" ? this.pickBtn : this.view === "size" ? this.sizeBtn : this.htmlBtn).focus(); // the focus leaves with the box, to its rail icon; a close from a rail button keeps the focus there
    }
    this.paint(); // labels dodge whichever chrome is showing
  }

  show(which) {
    // The box's one slot: the HTML or the CSS view; the rail's icon for the showing view reads expanded
    if (which === "css" && this.second) this.closeSecond(false); // the CSS view comes back from the second box
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
        if (this.view === "quick") this.renderQuick(this.quickEl, true); // the rules are in hand now
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
      else list.push({ el: this.probe, probe: true, bands: this.picking }); // the quick view's hover wears the margin and padding bands too
    }
    if (this.resize.sizing && this.resize.target) list.push({ el: this.resize.target, size: true });
    const scope = this.hasAttribute("open") ? (this.view === "quick" ? this.quickEl : this.view === "size" ? null : this.lens.scope[this.view]) : null; // the box's element: framed and named while its code (or its size) shows
    if (scope?.isConnected && !this.picks.has(scope) && scope !== this.probe) list.push({ el: scope, probe: true, bands: this.view === "quick" });
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
      const i = list.findIndex((m) => m.measure && m.el === this.rulerProbe); // the element under the pointer is painted last, so its chip and values sit on top of the crowd
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
    const chrome = [this.rail.getBoundingClientRect(), ...(this.hasAttribute("open") ? [this.panel.getBoundingClientRect()] : []), ...(this.second ? [this.panel2.getBoundingClientRect()] : [])]; // the labels dodge the rail and the open boxes
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
    this.painter.end(); this.reachCache = null;
  }

  setMeasuring(on) {
    // The ruler touches nothing else: picks, pins and the picker stay as they are under it
    if (on === this.measuring) return;
    this.measuring = on;
    if (on) {
      this.solo("measuring");
      // Any click anywhere but the ruler button itself and the two tool toggles beside it, on the page or in the panel, turns the ruler off; the page still gets its click.
      // While the picker or the resize tool is armed, their page clicks are theirs and the ruler stays
      this.rulerRuntime = new AbortController();
      addEventListener("pointermove", (e) => { // the element under the pointer is painted on top
        const el = e.composedPath().includes(this) ? null : document.elementsFromPoint(e.clientX, e.clientY).find((n) => !helper(n)) || null;
        if (el !== this.rulerProbe) { this.rulerProbe = el; this.paint(); }
      }, { passive: true, signal: this.rulerRuntime.signal });
      addEventListener("click", (e) => {
        const path = e.composedPath();
        if (this.dragged || path.includes(this.measureBtn) || path.includes(this.pickBtn) || path.includes(this.sizeBtn)) return;
        if (this.tools.active && (!path.includes(this) || path.includes(this.pickSurface))) return; // a page click an armed tool takes through its shield (a pick, a resize choice) leaves the ruler standing
        this.setMeasuring(false);
      }, { capture: true, signal: this.rulerRuntime.signal });
    } else { this.rulerRuntime?.abort(); this.rulerProbe = null; }
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

  openSecond(el, d = null) {
    // The resize view's door: the CSS view moves into the second box, scoped to the element (its whole CSS), the holding row centred when it is there;
    // the first box keeps the resize view, so the tool goes on once this one closes
    this.lens.scope.css = el; this.mode.css = "scope";
    this.applyScope("css");
    this.p2title.textContent = `CSS · ${name(el)}`;
    this.p2body.append(this.views.css); this.views.css.hidden = false;
    this.panel2.hidden = false; this.panel2.removeAttribute("data-folded"); this.second = true;
    const r = this.getBoundingClientRect(), w = this.panel2.offsetWidth;
    this.placeSecond(r.left - w - 12 >= 8 ? r.left - w - 12 : r.right + 12, r.top); // beside the box, on its start side when there is room
    const row = d && this.rowOf.get(d)?.row; if (row) row.scrollIntoView({ block: "center" });
    this.panel2.focus(); this.paint();
  }

  placeSecond(left, top) {
    if (this.phone()) { this.panel2.style.left = "0"; this.panel2.style.top = "8px"; return; }
    const w = this.panel2.offsetWidth, h = this.panel2.offsetHeight;
    this.panel2.style.left = `${Math.min(Math.max(left, 8), Math.max(innerWidth - w - 8, 8))}px`;
    this.panel2.style.top = `${Math.min(Math.max(top, 8), Math.max(innerHeight - h - 8, 8))}px`;
    this.paint();
  }

  closeSecond(refocus = true) {
    // The CSS view returns to the first box's slot (hidden unless that box shows it); the focus goes back to the door it came from
    if (!this.second) return;
    if (this.editor && !this.editor.finish(false)) this.editor.finish(true);
    this.body.append(this.views.css); this.views.css.hidden = this.view !== "css";
    this.panel2.hidden = true; this.second = false;
    if (refocus) (this.wblock.querySelector(".wgo") || this.panel).focus();
    this.paint();
  }

  solo(id) {
    // Arming a tool (or the ruler) turns every other one off and closes the open box: one tool works at a time
    if (id !== "picking") this.picker.setPicking(false);
    if (id !== "sizing") this.resize.setSizing(false);
    for (const which of ["html", "css"]) if (which !== id && this.lens.armed === which) this.lens.arm(which, false);
    if (id !== "measuring") this.setMeasuring(false);
    if (this.hasAttribute("open")) this.toggle(false);
  }

  renderQuick(el, force = false) {
    // The quick view's box: the hovered element's name and size, then what sets its width and what sets its height (a rule, or a note)
    const view = this.views.quick;
    if (!el) { if (!this.quickKey) view.replaceChildren(this.htmlView.note("Click an element on the page.")); return; }
    const r = el.getBoundingClientRect();
    const key = `${name(el)} ${fmt(r.width)} × ${fmt(r.height)}`;
    if (key === this.quickKey && !force) return;
    this.quickKey = key;
    const [entry] = sizeLadder(this.store, el);
    const head = document.createElement("div"); head.className = "qname"; head.append(span("re", name(el)), ` ${fmt(r.width)} × ${fmt(r.height)}px`);
    view.replaceChildren(head, this.boxModel(el), ...(entry ? sizeRows(entry, false) : []), ...this.contentRows(el));
  }

  contentRows(el) {
    // Under the width and height lines: the content box's size, the space between it and the element's edge (padding and border per axis), and the
    // element with its margins, the room it takes in the layout
    const { r, p, m, b } = this.painter.geometry(el);
    const pad = { w: p.l + p.r, h: p.t + p.b }, bor = { w: b.l + b.r, h: b.t + b.b }, mar = { w: m.l + m.r, h: m.t + m.b };
    const wh = (o) => `${fmt(o.w)} × ${fmt(o.h)}px`;
    const line = (word, size, ...why) => { const n = document.createElement("div"); n.className = "lim"; n.append(span("rp", word), " ", span("rv", wh(size)), ": ", ...why); return n; };
    const parts = [];
    if (pad.w || pad.h) parts.push(span("rp", "padding"), " ", span("rv", wh(pad)));
    if (bor.w || bor.h) parts.push(...(parts.length ? [", "] : []), span("rp", "border"), " ", span("rv", wh(bor)));
    return [
      line("content", { w: r.width - pad.w - bor.w, h: r.height - pad.h - bor.h }, "the box inside the padding"),
      ...this.textRow(el, line), // what the content actually covers, right under the content box
      line("space", { w: pad.w + bor.w, h: pad.h + bor.h }, ...(parts.length ? parts : ["none, the content fills the element"])),
      line("with margin", { w: r.width + mar.w, h: r.height + mar.h }, ...(mar.w || mar.h ? [span("rp", "margin"), " ", span("rv", wh(mar)), ", the room it takes in the layout"] : ["no margin, the element alone"])),
    ];
  }

  textRow(el, line) {
    // The rendered content's own box, a Range over the element's contents, what the text or the children actually cover inside the element:
    // the widest line by the lines' height with the line count and the alignment for text, the children's boxes together otherwise, and the free room beside it
    if (el instanceof SVGElement || /^(img|video|audio|canvas|iframe|input|textarea|select)$/.test(el.localName) || !el.childNodes.length) return [];
    const range = document.createRange(); range.selectNodeContents(el);
    const box = range.getBoundingClientRect(), rects = [...range.getClientRects()].filter((q) => q.width > 0 && q.height > 0);
    if (!box.width || !box.height) return [];
    const inline = [...el.children].every((c) => /^inline/.test(getComputedStyle(c).display)); // text and inline children: line boxes; block children: their boxes
    const tops = [...new Set(rects.map((q) => Math.round(q.top)))].length || 1; // one line box per distinct top
    const { r, p, b } = this.painter.geometry(el), free = r.width - p.l - p.r - b.l - b.r - box.width; // the room left in the content box
    const what = inline && el.textContent.trim() ? `${tops} line${tops === 1 ? "" : "s"}, ${getComputedStyle(el).textAlign.replace(/^(start|left)$/, "start-aligned").replace(/^(end|right)$/, "end-aligned").replace(/^center$/, "centered").replace(/^justify$/, "justified")}` : "the children's boxes together";
    return [line("rendered content", { w: box.width, h: box.height }, what, ...(free > 0.5 ? [", ", span("rv", fmt(free) + "px"), " free beside it"] : []))];
  }

  boxModel(el) {
    // The element's box model as nested layers, DevTools' picture: margin, border, padding around the content box, each side's value on its edge ("–" for none)
    const { r, p, m, b } = this.painter.geometry(el);
    const inner = { w: r.width - p.l - p.r - b.l - b.r, h: r.height - p.t - p.b - b.t - b.b };
    const layer = (cls, label, sides, child) => {
      const n = document.createElement("div"); n.className = `bm-layer ${cls}`;
      const v = (x) => (x ? fmt(x) : "–");
      n.append(span("bm-label", label), span("bm-t", v(sides.t)), span("bm-l", v(sides.l)), child, span("bm-r", v(sides.r)), span("bm-b", v(sides.b)));
      return n;
    };
    const content = document.createElement("div"); content.className = "bm-content"; content.textContent = `${fmt(inner.w)} × ${fmt(inner.h)}`;
    const box = document.createElement("div"); box.className = "bm";
    box.append(layer("bm-margin", "margin", m, layer("bm-border", "border", b, layer("bm-padding", "padding", p, content))));
    return box;
  }

  closeAll() {
    // Every tool off and the box closed in one go (a right click): the tools' own things go with them, the page's CSS and the pins stand
    if (this.editor) this.editor.finish(true, true);
    this.picker.setPicking(false);
    this.resize.setSizing(false);
    this.setMeasuring(false);
    if (this.lens.armed) this.lens.arm(this.lens.armed, false);
    if (this.hasAttribute("open")) this.toggle(false);
  }

  resetAll() {
    // The rail's Clear all: the page's CSS back, every pick and pin cleared, the tools off, the box closed, the chosen elements forgotten
    this.closeAll();
    this.lens.scope = { html: null, css: null };
    for (const which of ["html", "css"]) { this.mode[which] = "scope"; this.applyScope(which); }
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
      for (const d of model.decls) if (d.type === "decl") { d.value = d.orig; d.on = true; }
      this.store.settleChains(model); // a chain line the page's own write overrode stays off
      for (const d of model.decls) if (d.type === "decl") this.syncRow(d);
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
