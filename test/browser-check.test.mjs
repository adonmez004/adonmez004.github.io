import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { check } from '../tests/lib/check.mjs';
import { runSources, runSizeLinks } from '../tests/lib/feature-scenarios.mjs';

test('checkpoint retries a pending DOM state and returns the matching observation', async () => {
  let reads = 0;
  const value = await check('eventual state', () => ++reads, n => assert.equal(n, 3), { interval: 1, timeout: 1000 });
  assert.equal(value, 3); assert.equal(reads, 3);
});
test('checkpoint rejects a consistently wrong result with actual data', async () => {
  await assert.rejects(check('wrong width', () => ({ width: 7 }), v => assert.equal(v.width, 200), { timeout: 0 }), /wrong width:[\s\S]*"width":7/);
});
test('checkpoint does not hide a failed DOM read', async () => {
  await assert.rejects(check('missing DOM', () => { throw Error('missing view'); }, () => {}, { timeout: 0 }), /missing DOM: missing view/);
});
test('a failed checkpoint makes a standalone suite exit nonzero', () => {
  const module = new URL('../tests/lib/check.mjs', import.meta.url).href;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', `import {check} from ${JSON.stringify(module)}; await check('broken UI', () => false, x => {if (!x) throw Error('wrong result')}, {timeout:0});`], { encoding: 'utf8' });
  assert.equal(child.status, 1); assert.match(child.stderr, /broken UI: wrong result/);
});
// A fixture containing no result rows must not pass just because Array.every
// returns true for an empty array. Exercise the actual feature expectations.
for (const [name, scenario] of [['sources', runSources], ['sizelinks', runSizeLinks]]) {
  test(`${name} rejects an empty rendered feature`, async () => {
    let checked = false;
    await assert.rejects(scenario({
      open: async () => {}, click: async () => {}, read: () => ({}),
      check: async (_name, _read, verify) => { checked = true; verify({ head: 'computed', links: [], rows: 0, sources: [], struck: 0, heads: [] }); },
    }));
    assert.equal(checked, true);
  });
}
test('source feature rejects a heading missing from an otherwise plausible stack', async () => {
  await assert.rejects(runSources({
    open: async () => {}, click: async () => {},
    check: async (_name, _read, verify) => verify({ head: null, links: [{name:'All',pressed:true}], struck: 3, note: null }),
  }), /Computed heading exists/);
});

import { v021 } from '../tests/lib/v021-expectations.mjs';
test('two equally stationary panels cannot pass the drag regression', () => {
  assert.throws(() => v021.drag({ start: [240, 262], armedEnd: [240, 262], plainEnd: [240, 262] }), /actually move/);
});
test('an edit that restores the value but loses focus cannot pass', () => {
  assert.throws(() => v021.cancel({ open: true, editing: false, focusInBox: false, valueFocused: false, padding: '10px' }));
});
test('a duplicate important label cannot pass', () => {
  assert.throws(() => v021.hold({ note: 'held by ', label: 'max-width: 60px !important !important', bang: '!important' }));
});
test('an important token misplaced in the note cannot pass', () => {
  assert.throws(() => v021.hold({ note: 'held by !important', label: 'max-width: 60px !important', bang: '!important' }));
});
test('a correct width label cannot hide a wrong height label', () => {
  assert.throws(() => v021.overlay({ width: 60, height: 25.5, lines: [1, 1], labels: ['60px', '999px'], now: '60 × 25.5px+35.17 × 0px' }), /Height label/);
});
