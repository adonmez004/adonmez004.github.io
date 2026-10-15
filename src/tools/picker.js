// The picker: an element chosen on the page itself (or by its HTML row). A pick lights its row and the rules that select it; the picks stay
// until the tool ends or Reset. Alt while picking measures the gap to the hovered element. It reaches the panel through `ui` alone:
// host (the element: its picking attribute), btn, tools, rows() (the HTML rows), loadHtml(), setPickedRow(row, on), openCssFor(el), markHits(), paint()
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
      label: "Select an element · Esc to cancel",
      handlers: () => ({
        move: (target, event) => {
          this.alt = event.altKey;
          if (target !== this.probe || this.alt !== this.altWas) { this.probe = target; this.altWas = this.alt; ui.paint(); }
        },
        leave: () => { if (this.probe) { this.probe = null; ui.paint(); } },
        click: (target) => this.select(target),
        escape: () => { this.setPicking(false); ui.btn.focus(); },
        key: (event) => { if (event.key === "Alt" && this.alt !== (event.type === "keydown")) { this.alt = event.type === "keydown"; ui.paint(); } },
      }),
      arm: () => {
        // A page-wide crosshair says the next click picks; the inspector keeps its own cursors
        this.cursorStyle ||= Object.assign(document.createElement("style"), { textContent: "html, html *:not(fm-inspector) { cursor: crosshair !important; }" });
        document.head.append(this.cursorStyle);
      },
      release: () => { this.cursorStyle?.remove(); this.probe = null; },
    });
  }

  setPicking(on) {
    if (on === this.picking) return;
    this.picking = on;
    this.ui.btn.setAttribute("aria-pressed", String(on));
    this.ui.host.toggleAttribute("picking", on);
    if (on) this.ui.tools.arm("picking");
    else {
      this.alt = false;
      this.clear(); // like the ruler: what the picker marked goes when it closes; the resize tool's state stands
      this.ui.tools.end("picking");
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
