/**
 * v2 CONTENT + VERSION codec fidelity check against REAL builder data (:5435).
 *
 * The condition/action sweep (verify-codec.ts) covered rule NODES wherever they
 * appear. This one covers everything ELSE v2 content/version writes — the full
 * round-trip of each dimension through decompile → compile, using the ORIGINAL
 * value as the field-merge base (compile preserves untouched styling only by
 * merging against `existing`, so the faithful test is "given the original as the
 * merge base, do we reproduce it?"):
 *
 *   step.data     — block tree (matched per element BY ID; decompile flattens a
 *                   single column of N elements to N roots, a benign layout
 *                   normalization that a positional diff would misread)
 *   step.target   — element selector fingerprint
 *   step.setting  — placement / width / skippable
 *   step.trigger  — trigger wrappers (conditions/actions covered separately)
 *   config.start  — autoStartRules SETTING (frequency / priority / wait / …)
 *   config.hide   — hide rules wrapper
 *   data.<type>   — non-flow version data (checklist/launcher/banner/tracker/rc)
 *
 * Volatile ids are stripped. Diffs aggregate by field-path signature per
 * dimension. Read-only.
 *
 * Run: DATABASE_URL=... npx ts-node -r tsconfig-paths/register scripts/verify-content-codec.ts [limit]
 */
import { PrismaClient } from '@prisma/client';
import { stripIds, diffPaths } from './codec-diff';

import { compileStep } from '../src/api/content-representation/representation.compile';
import { decompileStep } from '../src/api/content-representation/representation.decompile';
import {
  compileHideRules,
  compileStartRules,
} from '../src/api/content-representation/rules.compile';
import {
  decompileHideRules,
  decompileStartRules,
} from '../src/api/content-representation/rules.decompile';
import { compileVersionData } from '../src/api/content-representation/version-data.compile';
import { decompileVersionData } from '../src/api/content-representation/version-data.decompile';

const prisma = new PrismaClient();
const ids = { attributeId: (c: string) => c, eventId: (c: string) => c };
const idR = { attributeCode: (i: string) => i, eventCode: (i: string) => i };

type Stat = { total: number; bad: number; sigs: Map<string, { count: number; sample?: any }> };
const dims = new Map<string, Stat>();
function get(dim: string): Stat {
  let s = dims.get(dim);
  if (!s) {
    s = { total: 0, bad: 0, sigs: new Map() };
    dims.set(dim, s);
  }
  return s;
}
/** Diff one dimension value (whole-fragment) and aggregate. */
function diffDim(dim: string, orig: any, rt: any): void {
  const s = get(dim);
  s.total++;
  const sig = diffPaths(stripIds(orig), stripIds(rt)).sort().join(' , ') || 'OK';
  if (sig === 'OK') return;
  s.bad++;
  const e = s.sigs.get(sig) ?? { count: 0 };
  e.count++;
  if (!e.sample) e.sample = { original: stripIds(orig), roundtrip: stripIds(rt) };
  s.sigs.set(sig, e);
}

/** step.data: match elements by id (layout re-wrap is benign), attribute by type. */
function flatten(roots: any, out: Map<string, any>): void {
  if (!Array.isArray(roots)) return;
  for (const root of roots)
    for (const col of root?.children ?? [])
      for (const el of col?.children ?? []) if (el?.id) out.set(el.id, el);
}
function diffBlocks(orig: any, rt: any): void {
  const o = new Map<string, any>();
  const b = new Map<string, any>();
  flatten(orig, o);
  flatten(rt, b);
  for (const [id, oel] of o) {
    const dim = `step.data:${oel?.element?.type ?? '?'}`;
    const s = get(dim);
    s.total++;
    const bel = b.get(id);
    const sig = !bel
      ? 'DROPPED'
      : diffPaths(stripIds(oel.element), stripIds(bel.element)).sort().join(' , ') || 'OK';
    if (sig === 'OK') continue;
    s.bad++;
    const e = s.sigs.get(sig) ?? { count: 0 };
    e.count++;
    if (!e.sample)
      e.sample = { original: stripIds(oel.element), roundtrip: bel ? stripIds(bel.element) : null };
    s.sigs.set(sig, e);
  }
}

let versions = 0;
let steps = 0;
const errs = new Map<string, number>();
function err(where: string, e: any): void {
  const k = `${where}: ${String(e?.message ?? e).slice(0, 60)}`;
  errs.set(k, (errs.get(k) ?? 0) + 1);
}

function roundTripVersion(type: string, config: any, data: any, stepRows: any[]): void {
  versions++;
  // config: start-rule setting + hide-rule wrapper
  if (config?.enabledAutoStartRules) {
    try {
      const rt = compileStartRules(decompileStartRules(config, idR as any), ids as any);
      diffDim('config.start', config.autoStartRulesSetting ?? {}, rt.autoStartRulesSetting ?? {});
    } catch (e) {
      err('config.start', e);
    }
  }
  if (config?.enabledHideRules) {
    try {
      const rt = compileHideRules(decompileHideRules(config, idR as any), ids as any);
      diffDim('config.hide', config.hideRules ?? [], rt.hideRules ?? []);
    } catch (e) {
      err('config.hide', e);
    }
  }
  // non-flow version data
  if (type !== 'flow' && data && typeof data === 'object') {
    try {
      const rep = decompileVersionData(type, data, idR as any);
      if (rep) {
        const rt = compileVersionData(type, rep, data, ids as any);
        diffDim(`data.${type}`, data, rt);
      }
    } catch (e) {
      err(`data.${type}`, e);
    }
  }
  // flow steps
  for (const step of stepRows) {
    steps++;
    try {
      const rep = decompileStep(step, idR as any);
      const rt = compileStep(rep as any, step, ids as any);
      diffBlocks(step.data, rt.data);
      diffDim('step.target', step.target ?? {}, rt.target ?? {});
      diffDim('step.setting', step.setting ?? {}, rt.setting ?? {});
      diffDim('step.trigger', step.trigger ?? [], rt.trigger ?? []);
    } catch (e) {
      err('step', e);
    }
  }
}

async function main() {
  const limit = process.argv[2] ? Number(process.argv[2]) : undefined;
  let off = 0;
  for (;;) {
    const rows = await prisma.version.findMany({
      select: {
        config: true,
        data: true,
        content: { select: { type: true } },
        steps: {
          select: {
            id: true,
            cvid: true,
            name: true,
            type: true,
            sequence: true,
            data: true,
            target: true,
            setting: true,
            trigger: true,
          },
        },
      },
      skip: off,
      take: 200,
    });
    if (!rows.length) break;
    for (const v of rows)
      roundTripVersion(
        (v as any).content?.type ?? 'flow',
        v.config,
        v.data,
        (v as any).steps ?? [],
      );
    off += rows.length;
    if (limit && off >= limit) break;
    if (off % 2000 === 0) console.error(`  ...${off} versions`);
  }
  console.log(`\nScanned ${versions} versions, ${steps} steps.\n`);
  console.log('dimension'.padEnd(24), 'total'.padStart(8), 'bad'.padStart(8));
  const ordered = [...dims.entries()].sort((a, b) => b[1].bad - a[1].bad);
  for (const [t, s] of ordered)
    console.log(t.padEnd(24), String(s.total).padStart(8), String(s.bad).padStart(8));
  if (errs.size) {
    console.log('\n--- errors ---');
    for (const [k, c] of [...errs.entries()].sort((a, b) => b[1] - a[1]))
      console.log(`  [${c}] ${k}`);
  }
  console.log('\n--- top diff signatures per dimension ---');
  for (const [t, s] of ordered) {
    if (!s.bad) continue;
    console.log(`\n### ${t} (total=${s.total}, bad=${s.bad})`);
    for (const [sig, e] of [...s.sigs.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 8))
      console.log(`  [${e.count}] ${sig}`);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
