// The picker, the rail's Quick view: an element hovered on the page (its box painted) or picked by its HTML row. A pick lights its row and the rules that select it; the picks stay
// until the tool ends or Reset. Alt while picking measures the gap to the hovered element. It reaches the panel through `ui` alone:
// host (the element: its picking attribute), btn, tools, rows() (the HTML rows), loadHtml(), setPickedRow(row, on), openCssFor(el), markHits(), paint(), quick(on) (its box)
import { PALETTE } from "../util.js";

export class Picker {
  constructor(ui) {
    this.ui = ui;
    this.picking = false;
    this.picks = new Map(); // element -> { row, hue } (hue = palette slot, the lowest one free at pick time)
    this.focusEl = null; // the last picked element: full box model on the page, its matched rules in the CSS tab
    this.probe = null; // the element under the pointer while picking
    this.alt = false; // Alt held while picking: the probe measures its distance from the last pick
    ui.tools.register("picking", {
      label: "Quick view · hover an element · Esc to cancel",
      handlers: () => ({
        move: (target, event) => {
          this.alt = event.altKey;
          if (target !== this.probe || this.alt !== this.altWas) { this.probe = target; this.altWas = this.alt; ui.paint(); }
        },
        leave: () => this.setProbe(null),
        click: (target) => ui.quick(true, target), // a click opens the quick view's box on that element; the hover keeps painting
        escape: () => { this.setPicking(false); ui.btn.focus(); },
        key: (event) => { if (event.key === "Alt" && this.alt !== (event.type === "keydown")) { this.alt = event.type === "keydown"; ui.paint(); } },
      }),
      arm: () => this.crosshair(true),
      release: () => { this.crosshair(false); this.probe = null; },
    });
  }

  crosshair(on) {
    // A page-wide crosshair says the next click chooses; the inspector keeps its own cursors. The lens shares it
    this.cursorStyle ||= Object.assign(document.createElement("style"), { textContent: "html, html *:not(fm-inspector) { cursor: crosshair !important; }" });
    if (on) document.head.append(this.cursorStyle); else this.cursorStyle.remove();
  }

  setProbe(el) {
    // The element under the pointer, painted as a probe (the lens shares it with the picker)
    if (el === this.probe) return;
    this.probe = el; this.ui.paint();
  }

  setPicking(on) {
    if (on === this.picking) return;
    this.picking = on;
    this.ui.btn.setAttribute("aria-pressed", String(on));
    this.ui.host.toggleAttribute("picking", on);
    if (on) this.ui.tools.arm("picking");
    else {
      this.alt = false;
      this.clear(); // what the picker marked goes when it closes
      this.ui.tools.end("picking");
      this.ui.quick(false);
    }
  }

  prune(isHelper) {
    for (const [el] of this.picks) if (!el.isConnected || isHelper(el)) this.picks.delete(el);
    if (!this.focusEl?.isConnected || isHelper(this.focusEl)) this.focusEl = [...this.picks.keys()].pop() || null;
  }

  select(el) {
    // A page click toggles the element's pick; a new pick lights its HTML row and opens the CSS tab on the rules that select it
    let row = this.ui.rows().get(el);
    if (!row) { this.ui.loadHtml(); row = this.ui.rows().get(el); }
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
    if (on) this.focusEl = el; else if (this.focusEl === el) this.focusEl = [...this.picks.keys()].pop() || null;
    this.ui.markHits();
    this.ui.paint();
  }

  clear() {
    // Every picked element off the page and out of the HTML rows
    for (const [, p] of this.picks) { this.ui.setPickedRow(p.row, false); p.row.style.removeProperty("--accent"); }
    this.picks.clear();
    this.focusEl = null;
    this.ui.markHits();
    this.ui.paint();
  }
}
