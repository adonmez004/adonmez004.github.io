// The page-wide tools' arbitration: which tools are OPEN (armed by their buttons) and which ONE is ACTIVE, taking the page's input through the shield.
// Arming a tool makes it active and keeps the others open; ending the active tool hands the input back to the one armed before it.
// A tool registers { label, handlers(), arm?(), release?() }: handlers() builds the shield's callbacks, arm/release wrap its turn at the input.
export class Tools {
  constructor({ pickTarget, isHelper, editing, cancelEdit, say }) {
    this.pickTarget = pickTarget; // the page element under a pointer event, found through the shield
    this.isHelper = isHelper; // a node that is not the page's own
    this.editing = editing; // an open value edit cancels on Escape before a tool ends
    this.cancelEdit = cancelEdit;
    this.say = say; // the state pill's line
    this.defs = new Map();
    this.open = []; // ids, in arm order
    this.active = null;
    this.runtime = null;
  }

  register(id, def) { this.defs.set(id, def); }

  isOpen(id) { return this.open.includes(id); }

  arm(id) {
    // The tool takes the input; a tool armed earlier stays open behind it
    this.open = [...this.open.filter((k) => k !== id), id];
    this.activate(id);
  }

  end(id) {
    // The tool lets go; the input goes back to the tool armed last among those still open
    this.open = this.open.filter((k) => k !== id);
    this.activate(this.open.at(-1) ?? null);
  }

  activate(id) {
    this.runtime?.abort(); this.runtime = null;
    if (this.active) this.defs.get(this.active)?.release?.();
    this.active = id;
    const def = id ? this.defs.get(id) : null;
    if (!def) return;
    this.say(def.label);
    this.runtime = this.shield(def.handlers());
    def.arm?.();
  }

  shield(handlers) {
    // Window-capture listeners for a page-wide tool: the shield takes the real pointer input and the page's handlers never see it;
    // scripted events are stopped before the page too. Touch events keep their default: a pan scrolls, a cancelled touchend would lose the tap's click
    const ctrl = new AbortController();
    const options = { capture: true, passive: false, signal: ctrl.signal };
    const onInput = (event) => {
      const target = this.pickTarget(event);
      if (!target || this.isHelper(target)) { if (event.type === "pointermove") handlers.leave?.(); return; }
      if (event.cancelable && !event.type.startsWith("touch")) event.preventDefault();
      event.stopImmediatePropagation();
      if (event.type === "pointermove" && target.nodeType === 1) handlers.move?.(target, event);
      else if (event.type === "click" && event.button === 0 && target.nodeType === 1) handlers.click?.(target, event);
    };
    const onKey = (event) => {
      // Escape ends the tool wherever the focus is; the panel's own Escape (close) never sees it. An open edit cancels first, the next Escape ends
      if (event.key === "Escape" && event.type === "keydown") {
        event.preventDefault(); event.stopImmediatePropagation();
        if (this.editing()) { this.cancelEdit(); return; }
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
}
