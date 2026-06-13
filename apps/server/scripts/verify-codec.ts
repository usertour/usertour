/**
 * v2 codec fidelity check against REAL builder data (prod dump on :5435).
 *
 * For every condition/action node found in real Version config/data + Step
 * data/target/trigger, round-trip it through v2 decompile→compile (identity
 * resolvers so attr/event ids pass through unchanged), strip the server-owned
 * volatile ids, and deep-diff against the original. Aggregates mismatches by
 * rule type so a shape bug (like navigate url-vs-value) surfaces as a count, not
 * a guess. Read-only.
 *
 * Scope caveat: nodes are round-tripped INDIVIDUALLY (each wrapped in a
 * one-element list), so the and/or `operators` joiner — a property of a node's
 * POSITION in its sibling list, not of the node itself — shows up here as noise
 * (an isolated node compiles with the default 'and'). The list-level and/or
 * semantics (top-level OR wrapping, group match derived from children) are
 * covered by the representation.compile/decompile unit tests instead.
 *
 * Run:  DATABASE_URL=... npx ts-node -r tsconfig-paths/register scripts/verify-codec.ts [limitPerType]
 */
import { PrismaClient } from '@prisma/client';

import { compileActions, compileConditions } from '../src/api/content-representation/rules.compile';
import {
  decompileAction,
  decompileCondition,
} from '../src/api/content-representation/rules.decompile';

const prisma = new PrismaClient();

const CONDITION_TYPES = new Set([
  'current-page',
  'user-attr',
  'segment',
  'element',
  'content',
  'event',
  'text-input',
  'text-fill',
  'time',
  'group',
]);
const ACTION_TYPES = new Set([
  'step-goto',
  'flow-start',
  'page-navigate',
  'flow-dismis',
  'banner-dismis',
  'checklist-dismis',
  'launcher-dismis',
  'javascript-evaluate',
]);
const idR = { attributeCode: (i: string) => i, eventCode: (i: string) => i };
const comR = { attributeId: (c: string) => c, eventId: (c: string) => c };

/** Recursively drop volatile server-owned ids so they don't count as diffs. */
function stripIds(v: any): any {
  if (Array.isArray(v)) return v.map(stripIds);
  if (v && typeof v === 'object') {
    const out: any = {};
    for (const k of Object.keys(v)) {
      if (k === 'id') continue;
      out[k] = stripIds(v[k]);
    }
    return out;
  }
  return v;
}
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    return a.every((x, i) => deepEqual(x, b[i]));
  }
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  return ka.every((k) => k in b && deepEqual(a[k], b[k]));
}

/** Field-path deltas between original and round-trip (both id-stripped). */
function diffPaths(a: any, b: any, base = '', out: string[] = []): string[] {
  if (deepEqual(a, b)) return out;
  const ao = a && typeof a === 'object';
  const bo = b && typeof b === 'object';
  if (!ao || !bo || Array.isArray(a) !== Array.isArray(b)) {
    out.push(`changed:${base || '.'}`);
    return out;
  }
  if (Array.isArray(a)) {
    if (a.length !== b.length) out.push(`len:${base}`);
    for (let i = 0; i < Math.max(a.length, b.length); i++) diffPaths(a[i], b[i], `${base}[]`, out);
    return out;
  }
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const p = base ? `${base}.${k}` : k;
    if (!(k in a)) out.push(`added:${p}`);
    else if (!(k in b)) out.push(`removed:${p}`);
    else diffPaths(a[k], b[k], p, out);
  }
  return out;
}

type Stat = { total: number; bad: number; sigs: Map<string, { count: number; sample?: any }> };
const stats = new Map<string, Stat>();
function get(type: string): Stat {
  let s = stats.get(type);
  if (!s) {
    s = { total: 0, bad: 0, sigs: new Map() };
    stats.set(type, s);
  }
  return s;
}

function roundTrip(node: any): void {
  const type = node?.type;
  if (typeof type !== 'string') return;
  const isCond = CONDITION_TYPES.has(type);
  const isAct = ACTION_TYPES.has(type);
  if (!isCond && !isAct) return;
  const s = get(type);
  s.total++;
  try {
    let back: any;
    if (isCond) back = compileConditions([decompileCondition(node, idR) as any], comR as any)[0];
    else back = compileActions([decompileAction(node) as any], comR as any)[0];
    const orig = stripIds(node);
    const rt = back === undefined ? undefined : stripIds(back);
    const sig =
      rt === undefined
        ? 'compiled-to-nothing'
        : diffPaths(orig, rt)
            .map((p) => p.replace(/\[\]/g, '[]'))
            .sort()
            .join(' , ') || 'OK';
    if (sig === 'OK') return;
    s.bad++;
    const e = s.sigs.get(sig) ?? { count: 0 };
    e.count++;
    if (!e.sample) e.sample = { original: orig, roundtrip: rt };
    s.sigs.set(sig, e);
  } catch (e: any) {
    s.bad++;
    const sig = `ERROR: ${String(e?.message ?? e).slice(0, 60)}`;
    const en = s.sigs.get(sig) ?? { count: 0 };
    en.count++;
    if (!en.sample) en.sample = { original: stripIds(node) };
    s.sigs.set(sig, en);
  }
}

/** Walk JSON; round-trip rule nodes, but don't descend into one once matched. */
function walk(v: any): void {
  if (Array.isArray(v)) {
    for (const x of v) walk(x);
    return;
  }
  if (v && typeof v === 'object') {
    if (typeof v.type === 'string' && (CONDITION_TYPES.has(v.type) || ACTION_TYPES.has(v.type))) {
      roundTrip(v);
      return; // decompile/compile handles the whole subtree
    }
    for (const k of Object.keys(v)) walk(v[k]);
  }
}

async function main() {
  const limit = process.argv[2] ? Number(process.argv[2]) : undefined;
  let vOffset = 0;
  let vCount = 0;
  const BATCH = 500;
  // versions: config + data
  for (;;) {
    const rows = await prisma.version.findMany({
      select: { config: true, data: true },
      skip: vOffset,
      take: BATCH,
      ...(limit ? {} : {}),
    });
    if (!rows.length) break;
    for (const r of rows) {
      walk(r.config);
      walk(r.data);
    }
    vCount += rows.length;
    vOffset += rows.length;
    if (limit && vCount >= limit) break;
    if (vOffset % 2000 === 0) console.error(`  ...${vOffset} versions`);
  }
  // steps: data + target + trigger
  let sOffset = 0;
  let sCount = 0;
  for (;;) {
    const rows = await prisma.step.findMany({
      select: { data: true, target: true, trigger: true },
      skip: sOffset,
      take: BATCH,
    });
    if (!rows.length) break;
    for (const r of rows) {
      walk(r.data);
      walk(r.target);
      walk(r.trigger);
    }
    sCount += rows.length;
    sOffset += rows.length;
    if (limit && sCount >= limit * 4) break;
    if (sOffset % 5000 === 0) console.error(`  ...${sOffset} steps`);
  }

  console.log(`\nScanned ${vCount} versions, ${sCount} steps.\n`);
  console.log('type'.padEnd(20), 'total'.padStart(8), 'bad'.padStart(8));
  const ordered = [...stats.entries()].sort((a, b) => b[1].bad - a[1].bad);
  for (const [t, s] of ordered) {
    console.log(t.padEnd(20), String(s.total).padStart(8), String(s.bad).padStart(8));
  }
  console.log('\n--- distinct diff signatures per type (count) ---');
  for (const [t, s] of ordered) {
    if (!s.bad) continue;
    console.log(`\n### ${t}  (total=${s.total}, bad=${s.bad})`);
    const sigs = [...s.sigs.entries()].sort((a, b) => b[1].count - a[1].count);
    for (const [sig, e] of sigs) {
      console.log(`  [${e.count}]  ${sig}`);
    }
  }
  console.log('\n--- one sample per signature ---');
  for (const [t, s] of ordered) {
    if (!s.bad) continue;
    for (const [sig, e] of s.sigs) {
      console.log(`\n### ${t} :: ${sig}`);
      console.log(JSON.stringify(e.sample, null, 1).slice(0, 900));
    }
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
