import { runSources, runSizeLinks, invariant } from '../lib/feature-scenarios.mjs';
const button = document.querySelector('#run'), output = document.querySelector('#results'), status = document.querySelector('#status');
const tick = w => new Promise(done => w.requestAnimationFrame(() => w.requestAnimationFrame(done)));
button.addEventListener('click', async () => {
  button.disabled = true;
  const tests = [], errors = [];
  for (const [name, scenario] of [['sources', runSources], ['sizelinks', runSizeLinks]]) {
    const frame = document.createElement('iframe');
    try {
      await new Promise((done, reject) => {
        const timer = setTimeout(() => reject(new Error('Fixture load timed out')), 8000);
        frame.onload = () => { clearTimeout(timer); done(); };
        frame.onerror = () => { clearTimeout(timer); reject(new Error('Fixture failed to load')); };
        frame.src = `${name}.html`;
        document.body.append(frame);
      });
      const w = frame.contentWindow, doc = frame.contentDocument, i = doc.querySelector('fm-inspector');
      invariant(i?.shadowRoot, 'Inspector mounted');

      await scenario({
        open: async selector => { const el = doc.querySelector(selector); invariant(el, `Fixture target ${selector}`); i.lens.arm('css'); i.lens.choose('css', el); await tick(w); },
        click: async (selector, text) => {
          const buttons = [...i.shadowRoot.querySelectorAll(selector)];
          const el = text === undefined ? buttons[0] : buttons.find(b => b.textContent === text);
          invariant(el, `Control ${selector} ${text || ''}`); el.focus(); el.click(); await tick(w);
        },
        replaceAuthorCSS: async css => { doc.head.querySelector('style').textContent = css; await tick(w); },
        read: fn => fn(i.shadowRoot),
        check: async (label, read, verify) => {
          const until = Date.now() + 3000; let actual, error;
          do {
            try { actual = await read(); verify(actual); error = null; break; }
            catch (e) { error = e; }
            await tick(w);
          } while (Date.now() < until);
          tests.push({ suite: name, name: label, status: error ? 'FAIL' : 'PASS', ...(error ? { error: error.message, actual } : {}) });
          if (error) throw error;
        },
      });
    } catch (error) {
      if (tests.at(-1)?.status !== 'FAIL') tests.push({ suite: name, name: 'Fixture setup or action', status: 'FAIL', error: error.message });
    } finally { errors.push(...(frame.contentWindow?.fixtureErrors || [])); frame.remove(); }
  }
  if (errors.length) tests.push({ name: 'No uncaught page errors', status: 'FAIL', errors });
  const result = { passed: tests.filter(t => t.status === 'PASS').length, failed: tests.filter(t => t.status === 'FAIL').length, errors, tests };
  status.textContent = `${result.passed} passed, ${result.failed} failed`;
  status.className = result.failed ? 'fail' : 'pass';
  const summary = document.querySelector('#summary'); summary.replaceChildren();
  for (const suite of ['sources', 'sizelinks']) {
    const section = document.createElement('section'), h = document.createElement('h2'), list = document.createElement('ul');
    h.textContent = suite === 'sources' ? 'Source filters' : 'Size ladder';
    for (const row of tests.filter(t => t.suite === suite)) {
      const item = document.createElement('li'); item.textContent = `${row.status} · ${row.name}`;
      item.className = row.status === 'PASS' ? 'pass' : 'fail'; list.append(item);
    }
    section.append(h, list); summary.append(section);
  }
  output.textContent = JSON.stringify(result, null, 2);
  button.disabled = false;
});
