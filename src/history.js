// One undo stack: entries newest last, capped, a listener told whenever the length changes (the undo buttons dim on empty).
// The CSS edits and the resizes keep SEPARATE instances: two buttons, two stacks (DECISIONS.md, Undo and Reset).
export class History {
  constructor(onChange, cap = 200) {
    this.entries = [];
    this.cap = cap;
    this.onChange = onChange;
  }

  get length() { return this.entries.length; }

  push(entry) {
    this.entries.push(entry);
    if (this.entries.length > this.cap) this.entries.shift();
    this.onChange?.(this.entries.length);
  }

  pop() {
    const entry = this.entries.pop();
    this.onChange?.(this.entries.length);
    return entry;
  }

  clear() {
    this.entries = [];
    this.onChange?.(0);
  }

  some(fn) { return this.entries.some(fn); }
}
