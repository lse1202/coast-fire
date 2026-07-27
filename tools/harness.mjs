// Loads the real page script out of index.html and runs it in Node against a
// minimal DOM shim. Nothing here reimplements the model — the checks call the
// same read()/compute()/render() the browser does, so they can't drift from
// the shipped code.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
export const HTML = readFileSync(join(here, '..', 'index.html'), 'utf8');

function fakeEl(id, attrs = {}) {
  return {
    id,
    value: attrs.value ?? '',
    dataset: {},
    textContent: '',
    innerHTML: '',
    className: '',
    style: { setProperty() {} },
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    addEventListener() {},
    querySelector: () => null,
    getBoundingClientRect: () => ({ left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 }),
  };
}

export function load() {
  const script = /<script>([\s\S]*)<\/script>/.exec(HTML)[1];

  // seed each element with the value= attribute declared in the markup
  const els = {};
  for (const m of HTML.matchAll(/<input[^>]*id="(\w+)"[^>]*>/g)) {
    const tag = m[0];
    const val = /value="([^"]*)"/.exec(tag);
    els[m[1]] = fakeEl(m[1], { value: val ? val[1] : '' });
  }
  for (const m of HTML.matchAll(/id="(\w+)"/g)) els[m[1]] ??= fakeEl(m[1]);

  const ctx = {
    document: {
      getElementById: (id) => (els[id] ??= fakeEl(id)),
      querySelectorAll: () => [],
      addEventListener() {},
    },
    window: { innerWidth: 1200, addEventListener() {} },
    Intl,
    Math,
    console,
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(script, ctx);
  return { ctx, els };
}

// Parsing and compiling the page costs ~100ms, which is fine once and ruinous
// across a 100k-scenario sweep. Load lazily, then reuse — resetting every input
// to its markup default each run so nothing leaks between scenarios.
let _session = null;
let _defaults = null;

export function session() {
  if (!_session) {
    _session = load();
    _defaults = {};
    for (const [k, el] of Object.entries(_session.els)) _defaults[k] = el.value;
  }
  return _session;
}

// Set slider values, re-run the page's own update(), return model + chart SVG.
export function scenario(inputs) {
  const { ctx, els } = session();
  for (const [k, v] of Object.entries(_defaults)) els[k].value = v;
  for (const [k, v] of Object.entries(inputs)) {
    if (!els[k]) throw new Error(`no input #${k} in index.html`);
    els[k].value = String(v);
  }
  ctx.update();
  const p = ctx.read();
  return { p, c: ctx.compute(p), svg: els.chart.innerHTML, els };
}

export const fmt = (n) =>
  n === null || n === undefined ? '—' : Math.round(n).toLocaleString('de-DE');

export function report(name, pass, detail = '') {
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  ' + detail : ''}`);
  return pass;
}
