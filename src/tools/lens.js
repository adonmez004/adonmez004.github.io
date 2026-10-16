// The lens: the HTML and CSS icons arm a page-wide tool, like the resize tool; a click on the page chooses the element, and the box opens with that
// element's HTML (its subtree) or its CSS (the rules that reach it). The tool stays armed, the next click chooses again; Escape or the icon ends it.
// It reaches the panel through `ui` alone: host (its lens attribute: the shield and the state pill), btn(which), tools, crosshair(on), probe(el), show(which, el), paint()
export class Lens {
  constructor(ui) {
    this.ui = ui;
    this.armed = null; // "html" | "css" | null
    this.scope = { html: null, css: null }; // the chosen element per view
    for (const which of ["html", "css"]) ui.tools.register(which, {
      label: "Click an element · Esc to cancel",
      handlers: () => ({
        move: (target) => ui.probe(target),
        leave: () => ui.probe(null),
        click: (target) => this.choose(which, target),
        escape: () => { this.arm(which, false); ui.btn(which).focus(); },
      }),
      arm: () => ui.crosshair(true),
      release: () => { ui.crosshair(false); ui.probe(null); },
    });
  }

  arm(which, on = this.armed !== which) {
    // One lens at a time: arming the other ends this one
    if (on === (this.armed === which)) return;
    if (on && this.armed) { const was = this.armed; this.armed = null; this.ui.btn(was).setAttribute("aria-pressed", "false"); this.ui.tools.end(was); }
    this.armed = on ? which : null;
    this.ui.host.toggleAttribute("lens", !!this.armed);
    this.ui.btn(which).setAttribute("aria-pressed", String(on));
    if (on) this.ui.tools.arm(which); else this.ui.tools.end(which);
    this.ui.paint();
  }

  choose(which, el) {
    this.scope[which] = el;
    this.ui.show(which, el);
  }

  prune(isHelper) {
    // A chosen element that left the page (or turned out to be a helper) is forgotten: the view falls back to the whole
    let changed = false;
    for (const which of ["html", "css"]) if (this.scope[which] && (!this.scope[which].isConnected || isHelper(this.scope[which]))) { this.scope[which] = null; changed = true; }
    return changed;
  }
}
