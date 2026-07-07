/**
 * CREATE-PARITY check: does content authored FRESH via v2/MCP match what the
 * builder produces? Unlike verify-content-codec.ts (round-trip WITH the original
 * as merge base — proves "read+write loses nothing"), this simulates the actual
 * MCP CREATE path, which has NO merge base:
 *   - flow step:  compileStep(decompile(real), existing=undefined)   (a new step)
 *   - non-flow:   compileVersionData(type, decompile(real), existing=DEFAULT_*_DATA)
 *                 (create_content seeds the type default, then update merges)
 * and diffs the result against the original builder internal. Diffs (minus the
 * intentional-loss allowlist) are exactly where MCP-create != builder.
 *
 * Run: DATABASE_URL=... npx ts-node -r tsconfig-paths/register scripts/verify-create-parity.ts [limit]
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
import { defaultVersionData } from '../src/api/content-representation/version-data.defaults';

const prisma = new PrismaClient();
const ids = { attributeId: (c: string) => c, eventId: (c: string) => c };
const idR = { attributeCode: (i: string) => i, eventCode: (i: string) => i };

// Field-path fragments that are INTENTIONALLY not byte-identical via the codec.
const ALLOW = [
  // text: Slate rich formatting is lossy by design (markdown subset)
  '.text',
  '.color',
  '.align',
  '.bold',
  '.italic',
  '.underline',
  '.fontSize',
  '.children', // Slate node re-nesting
  // target "auto" fingerprint is not authorable (agent uses manual selectors)
  'elementData.selectors',
  'elementData.precision',
  'elementData.isDynamicContent',
  'elementData.content',
  'elementData.type',
  'target.selectors',
  'target.precision',
  'target.isDynamicContent',
  'target.content',
  'target.type',
  'target.customSelector',
  'target.sequence',
  'data.type', // legacy condition data.type noise (seen in verify-content-codec)
];
const allowed = (sig: string) => ALLOW.some((a) => sig.includes(a));

type Stat = { total: number; flagged: number; sigs: Map<string, number> };
const dims = new Map<string, Stat>();
function get(dim: string): Stat {
  let s = dims.get(dim);
  if (!s) {
    s = { total: 0, flagged: 0, sigs: new Map() };
    dims.set(dim, s);
  }
  return s;
}
/**
 * The create-parity GAP = field paths that diverge in CREATE mode (no merge base)
 * but NOT in ROUND-TRIP mode (original as merge base). Round-trip diffs are the
 * codec's accepted normalizations (operators/logic drops, condition canonical
 * form); subtracting them leaves only what breaks BECAUSE there's no merge base —
 * the modal-setting class. Then the allowlist removes intentional losses.
 */
function gap(create: string[], roundtrip: string[]): string[] {
  const rt = new Set(roundtrip);
  return create.filter((d) => !rt.has(d) && !allowed(d));
}
function record(dim: string, sig: string[]): void {
  const s = get(dim);
  s.total++;
  if (!sig.length) return;
  s.flagged++;
  s.sigs.set(sig.sort().join(' , '), (s.sigs.get(sig.sort().join(' , ')) ?? 0) + 1);
}
function diffDim(dim: string, orig: any, createRt: any, roundRt: any): void {
  record(
    dim,
    gap(
      diffPaths(stripIds(orig), stripIds(createRt)),
      diffPaths(stripIds(orig), stripIds(roundRt)),
    ),
  );
}

function flatten(roots: any, out: Map<string, any>): void {
  if (!Array.isArray(roots)) return;
  for (const root of roots)
    for (const col of root?.children ?? [])
      for (const el of col?.children ?? []) if (el?.id) out.set(el.id, el);
}
function diffBlocks(orig: any, createData: any, roundData: any): void {
  const o = new Map<string, any>();
  const bc = new Map<string, any>();
  const br = new Map<string, any>();
  flatten(orig, o);
  flatten(createData, bc);
  flatten(roundData, br);
  for (const [id, oel] of o) {
    const dim = `step.data:${oel?.element?.type ?? '?'}`;
    const c = bc.get(id);
    const r = br.get(id);
    const createDiff = !c ? ['DROPPED'] : diffPaths(stripIds(oel.element), stripIds(c.element));
    const roundDiff = !r ? ['DROPPED'] : diffPaths(stripIds(oel.element), stripIds(r.element));
    record(dim, gap(createDiff, roundDiff));
  }
}

let versions = 0;
let steps = 0;
const errs = new Map<string, number>();
function err(where: string, e: any): void {
  const k = `${where}: ${String(e?.message ?? e).slice(0, 70)}`;
  errs.set(k, (errs.get(k) ?? 0) + 1);
}

function parityVersion(type: string, config: any, data: any, stepRows: any[]): void {
  versions++;
  // Rules have no merge base (compile is deterministic), so create == round-trip:
  // any config diff is general normalization, not a create gap. Pass rt as both.
  if (config?.enabledAutoStartRules) {
    try {
      const rt = compileStartRules(decompileStartRules(config, idR as any), ids as any);
      const o = config.autoStartRulesSetting ?? {};
      diffDim('config.start', o, rt.autoStartRulesSetting ?? {}, rt.autoStartRulesSetting ?? {});
    } catch (e) {
      err('config.start', e);
    }
  }
  if (config?.enabledHideRules) {
    try {
      const rt = compileHideRules(decompileHideRules(config, idR as any), ids as any);
      diffDim('config.hide', config.hideRules ?? [], rt.hideRules ?? [], rt.hideRules ?? []);
    } catch (e) {
      err('config.hide', e);
    }
  }
  if (type !== 'flow' && data && typeof data === 'object') {
    try {
      const rep = decompileVersionData(type, data, idR as any);
      if (rep) {
        // CREATE: merge onto the type default seed (create_content). ROUND-TRIP: onto original.
        const create = compileVersionData(
          type,
          rep,
          defaultVersionData(type) ?? undefined,
          ids as any,
        );
        const round = compileVersionData(type, rep, data, ids as any);
        diffDim(`data.${type}`, data, create, round);
      }
    } catch (e) {
      err(`data.${type}`, e);
    }
  }
  for (const step of stepRows) {
    steps++;
    try {
      const rep = decompileStep(step, idR as any);
      // CREATE: a fresh step has no existing to merge onto. ROUND-TRIP: merge onto self.
      const create = compileStep(rep as any, undefined, ids as any);
      const round = compileStep(rep as any, step as any, ids as any);
      diffBlocks(step.data, create.data, round.data);
      diffDim('step.setting', step.setting ?? {}, create.setting ?? {}, round.setting ?? {});
      diffDim('step.target', step.target ?? {}, create.target ?? {}, round.target ?? {});
      diffDim('step.trigger', step.trigger ?? [], create.trigger ?? [], round.trigger ?? []);
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
      parityVersion((v as any).content?.type ?? 'flow', v.config, v.data, (v as any).steps ?? []);
    off += rows.length;
    if (limit && off >= limit) break;
    if (off % 2000 === 0) console.error(`  ...${off} versions`);
  }
  console.log(`\nCREATE-PARITY scan: ${versions} versions, ${steps} steps.\n`);
  console.log('dimension'.padEnd(22), 'total'.padStart(8), 'CREATE-GAP'.padStart(11));
  const ordered = [...dims.entries()].sort((a, b) => b[1].flagged - a[1].flagged);
  for (const [t, s] of ordered)
    console.log(t.padEnd(22), String(s.total).padStart(8), String(s.flagged).padStart(11));
  if (errs.size) {
    console.log('\n--- compile errors ---');
    for (const [k, c] of [...errs.entries()].sort((a, b) => b[1] - a[1]))
      console.log(`  [${c}] ${k}`);
  }
  console.log('\n--- FLAGGED signatures (allowlist removed = real MCP≠builder gaps) ---');
  let anyFlagged = false;
  for (const [t, s] of ordered) {
    if (!s.flagged) continue;
    anyFlagged = true;
    console.log(`\n### ${t} (flagged=${s.flagged}/${s.total})`);
    for (const [sig, c] of [...s.sigs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10))
      console.log(`  [${c}] ${sig}`);
  }
  if (!anyFlagged) console.log('  none — every diff is in the intentional-loss allowlist ✓');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
