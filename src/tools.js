// The page-wide tools' arbitration: which tools are OPEN (armed by their buttons) and which ONE is ACTIVE, taking the page's input through the shield.
// Arming a tool makes it active; the host's onSwitch turns the others off first, so one tool stands at a time (the stack remains for a tool armed under another).
// A tool registers { label, handlers(), arm?(), release?() }: handlers() builds the shield's callbacks, arm/release wrap its turn at the input.
export class Tools {
  constructor({ pickTarget, isHelper, editing, cancelEdit, say, onSwitch, busy = () => false }) {
    this.busy = busy; // a gesture of the host's own runs (a head drag, a sheet pull, the handle): the shield leaves its pointer events alone
    this.pickTarget = pickTarget; // the page element under a pointer event, found through the shield
    this.onSwitch = onSwitch; // called before a tool is armed: the host turns every other tool off, one tool at a time
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
    this.onSwitch?.(id);
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
      // A right click closes everything at once through the host's own capture listener (registered first); the page's menu never opens over an armed tool
      if (event.type === "contextmenu") { event.preventDefault(); event.stopImmediatePropagation(); return; }
      if (this.busy()) return; // the host's own gesture owns the pointer: a sheet pull that leaves the sheet, a head drag over the page
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
