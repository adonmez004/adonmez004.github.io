import assert from 'node:assert/strict';
export const v021 = {
  lens(s) { assert.equal(s.open, true); assert.equal(s.armed, null); },
  edit(s) { assert.equal(s.editing, true); assert.equal(s.focusInBox, true); assert.equal(s.padding, '11px'); },
  cancel(s) { assert.equal(s.open, true); assert.equal(s.editing, false); assert.equal(s.focusInBox, true); assert.equal(s.valueFocused, true); assert.equal(s.padding, '10px'); },
  closed(s) { assert.equal(s.open, false); },
  drag({ start, armedEnd, plainEnd }) {
    assert.ok(armedEnd[0] < start[0] - 200 && armedEnd[1] < start[1] - 200, `Armed drag must actually move: ${JSON.stringify({ start, armedEnd })}`);
    plainEnd.forEach((v, n) => assert.ok(Math.abs(v - armedEnd[n]) <= 1, `Axis ${n}: ${v} vs ${armedEnd[n]}`));
  },
  hold(s) {
    assert.match(s.note || '', /held by/); assert.doesNotMatch(s.note, /!important/);
    assert.match(s.label || '', /max-width:\s*60px\s*!important/);
    assert.equal((s.label.match(/!important/g) || []).length, 1);
    assert.equal(s.bang?.trim(), '!important');
  },
  overlay(s) {
    assert.deepEqual(s.lines, [1, 1]); assert.ok(Math.abs(s.width - 60) <= 0.5, `Actual width: ${s.width}`);
    assert.ok(s.labels.includes('60px'));
    assert.ok(s.labels.some(v => Math.abs(parseFloat(v) - s.height) < 0.51), 'Height label matches layout');
    assert.match(s.now, /[+−-]\s*\d/);
  },
};
