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
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { JSDOM } from 'jsdom';

const HERE = dirname(fileURLToPath(import.meta.url));
const SELF = fileURLToPath(import.meta.url);

// Parent mode: run the boot check twice — a normal DOM, then one where ANY
// localStorage access THROWS (sandboxed iframe / strict privacy policies).
// A logger or cache touching storage unguarded at module scope kills the whole
// SDK in exactly those pages, and the normal pass can't see it.
if (!process.env.SMOKE_MODE) {
  for (const mode of ['normal', 'no-storage']) {
    execFileSync(process.execPath, [SELF], {
      stdio: 'inherit',
      env: { ...process.env, SMOKE_MODE: mode },
    });
  }
  process.exit(0);
}
const NO_STORAGE = process.env.SMOKE_MODE === 'no-storage';
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
const jsdomWindow = dom.window;
const throwSecurity = () => {
  throw new jsdomWindow.DOMException('Storage is disabled in this context', 'SecurityError');
};
// In no-storage mode, wrap the window so touching localStorage/sessionStorage
// throws exactly like a sandboxed iframe does; everything else passes through.
const w = NO_STORAGE
  ? new Proxy(jsdomWindow, {
      get(target, key) {
        if (key === 'localStorage' || key === 'sessionStorage') throwSecurity();
        const value = target[key];
        return typeof value === 'function' ? value.bind(target) : value;
      },
    })
  : jsdomWindow;

// Browser globals the bundle touches at module init. jsdom's window carries
// most; define lazily and tolerate node's own read-only globals (navigator).
const expose = {
  window: w,
  document: jsdomWindow.document,
  location: jsdomWindow.location,
  history: jsdomWindow.history,
  getComputedStyle: jsdomWindow.getComputedStyle.bind(jsdomWindow),
  HTMLElement: jsdomWindow.HTMLElement,
  HTMLIFrameElement: jsdomWindow.HTMLIFrameElement,
  Element: jsdomWindow.Element,
  Node: jsdomWindow.Node,
  CustomEvent: jsdomWindow.CustomEvent,
  MutationObserver: jsdomWindow.MutationObserver,
  requestAnimationFrame: (cb) => setTimeout(() => cb(Date.now()), 16),
  cancelAnimationFrame: clearTimeout,
};
for (const [k, v] of Object.entries(expose)) {
  try {
    if (!(k in globalThis) || globalThis[k] == null) globalThis[k] = v;
  } catch {}
}
for (const storageKey of ['localStorage', 'sessionStorage']) {
  try {
    if (NO_STORAGE) {
      Object.defineProperty(globalThis, storageKey, { get: throwSecurity, configurable: true });
    } else if (!(storageKey in globalThis) || globalThis[storageKey] == null) {
      globalThis[storageKey] = jsdomWindow[storageKey];
    }
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
  jsdomWindow[k] ??= v;
  try {
    globalThis[k] ??= v;
  } catch {}
}

try {
  await import(pathToFileURL(entry).href);
} catch (e) {
  console.error(`SMOKE FAIL [${process.env.SMOKE_MODE}] — bundle threw during module evaluation:`);
  console.error('  ', String(e?.stack ?? e).split('\n').slice(0, 4).join('\n   '));
  process.exit(1);
}

// Boot is synchronous module init + microtasks; give timers a beat.
await new Promise((r) => setTimeout(r, 300));

if (typeof w.usertour === 'undefined' || w.usertour === null) {
  console.error(`SMOKE FAIL [${process.env.SMOKE_MODE}] — bundle evaluated but window.usertour never appeared.`);
  process.exit(1);
}
console.log(`smoke OK [${process.env.SMOKE_MODE}] — chunked es2020 bundle boots; window.usertour is present.`);
process.exit(0);
