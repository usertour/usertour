#!/usr/bin/env node
/**
 * Post-build runtime smoke: import the built CHUNKED es2020 bundle and assert
 * the SDK actually BOOTS (`window.usertour` appears).
 *
 * Guards the class of failure where tsc, unit tests and `vite build` are all
 * green but the bundle dies at module init — e.g. a cross-chunk import cycle
 * turning an enum consumed as a top-level computed key into `undefined`
 * (vendor-base exists for exactly that; see vite.config.ts). Two things are
 * deliberate: (1) it runs the CHUNKED es build — the legacy IIFE inlines
 * everything into one file and cannot exhibit chunk-ordering bugs; (2) it uses
 * node's native ESM loader, so static-import evaluation order is the real
 * thing, not a re-implementation.
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';

const HERE = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(HERE, '../package.json'), 'utf8'));
const entry = join(HERE, `../dist/${pkg.version}/es2020/usertour.js`);
if (!existsSync(entry)) {
  console.error(`smoke: missing ${entry} — build the es2020 target first.`);
  process.exit(1);
}

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'https://smoke.local/',
  pretendToBeVisual: true,
});
const w = dom.window;

// Browser globals the bundle touches at module init. jsdom's window carries
// most; define lazily and tolerate node's own read-only globals (navigator).
const expose = {
  window: w,
  document: w.document,
  location: w.location,
  history: w.history,
  localStorage: w.localStorage,
  sessionStorage: w.sessionStorage,
  getComputedStyle: w.getComputedStyle.bind(w),
  HTMLElement: w.HTMLElement,
  HTMLIFrameElement: w.HTMLIFrameElement,
  Element: w.Element,
  Node: w.Node,
  CustomEvent: w.CustomEvent,
  MutationObserver: w.MutationObserver,
  requestAnimationFrame: (cb) => setTimeout(() => cb(Date.now()), 16),
  cancelAnimationFrame: clearTimeout,
};
for (const [k, v] of Object.entries(expose)) {
  try {
    if (!(k in globalThis) || globalThis[k] == null) globalThis[k] = v;
  } catch {}
}
// Shims for APIs jsdom lacks; put them on window too (bundle may read either).
const shims = {
  matchMedia: () => ({ matches: false, media: '', addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => false }),
  ResizeObserver: class { observe() {} unobserve() {} disconnect() {} },
  IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } },
  WebSocket: class { close() {} send() {} addEventListener() {} removeEventListener() {} },
};
for (const [k, v] of Object.entries(shims)) {
  w[k] ??= v;
  try {
    globalThis[k] ??= v;
  } catch {}
}

try {
  await import(pathToFileURL(entry).href);
} catch (e) {
  console.error('SMOKE FAIL — bundle threw during module evaluation:');
  console.error('  ', String(e?.stack ?? e).split('\n').slice(0, 4).join('\n   '));
  process.exit(1);
}

// Boot is synchronous module init + microtasks; give timers a beat.
await new Promise((r) => setTimeout(r, 300));

if (typeof w.usertour === 'undefined' || w.usertour === null) {
  console.error('SMOKE FAIL — bundle evaluated but window.usertour never appeared.');
  process.exit(1);
}
console.log('smoke OK — chunked es2020 bundle boots; window.usertour is present.');
process.exit(0);
