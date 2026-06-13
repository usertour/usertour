/**
 * Generate human-readable markdown field tables for the v2 content representation,
 * straight from the zod schemas (SSOT) — so the docs' field tables never drift.
 * Prose + JSON examples are hand-written in the MDX; this emits only the tables.
 *
 * Run: npx ts-node -r tsconfig-paths/register scripts/gen-doc-tables.ts <group>
 *   groups: blocks | conditions | actions | rules | data
 */
import { z } from 'zod';

import {
  representationAction,
  representationBlock,
  representationCondition,
  representationHideRules,
  representationQuestion,
  representationStartRules,
  representationStepInput,
} from '../src/api/content-representation/representation.schema';
import { representationResourceCenter } from '../src/api/content-representation/resource-center.schema';
import {
  representationBanner,
  representationChecklist,
  representationLauncher,
  representationTracker,
} from '../src/api/content-representation/version-data.schema';

type JS = any;

function toJson(s: z.ZodType): JS {
  return z.toJSONSchema(s, { unrepresentable: 'any', io: 'input' } as any);
}

/** Resolve a $ref against the schema's $defs (one hop). */
function deref(node: JS, root: JS): JS {
  if (node?.$ref) {
    const name = String(node.$ref).split('/').pop();
    return root.$defs?.[name] ?? node;
  }
  return node;
}

/** Short, human type label for a property schema. */
function typeLabel(p: JS, root: JS): string {
  if (!p || typeof p !== 'object') return '—';
  if (p.const !== undefined) return `\`"${p.const}"\``;
  if (p.enum) return p.enum.map((e: string) => `\`${e}\``).join(' \\| ');
  if (p.$ref) return String(p.$ref).split('/').pop() ?? 'object';
  if (p.anyOf || p.oneOf) {
    const members = (p.anyOf ?? p.oneOf).filter((m: JS) => m.type !== 'null');
    return members.map((m: JS) => typeLabel(m, root)).join(' \\| ');
  }
  if (p.type === 'array') return `${typeLabel(p.items, root)}[]`;
  if (p.type === 'object') {
    const keys = Object.keys(p.properties ?? {});
    // Backtick the brace shape — raw { } in an MDX table cell is parsed as a JSX
    // expression and breaks the page body.
    return keys.length ? `\`object{ ${keys.join(', ')} }\`` : '`object`';
  }
  return p.type ?? '—';
}

// Friendly, cross-referenced type labels by field name — collapses the verbose
// recursive unions (actions/conditions/question) into a named link, and names the
// small shared shapes. Keeps the tables readable and the docs cross-linked.
const CA = '/api-reference-v2/conditions-and-actions';
const NAMED: Record<string, string> = {
  actions: `[Action](${CA}#actions)[]`,
  do: `[Action](${CA}#actions)[]`,
  when: `[Condition](${CA}#conditions)[]`,
  disabledWhen: `[Condition](${CA}#conditions)[]`,
  hiddenWhen: `[Condition](${CA}#conditions)[]`,
  completeWhen: `[Condition](${CA}#conditions)[]`,
  onlyShowWhen: `[Condition](${CA}#conditions)[]`,
  where: `[Condition](${CA}#conditions)[]`,
  conditions: `[Condition](${CA}#conditions)[]`,
  question: '[Question](#questions)',
  triggers: '[Trigger](/api-reference-v2/rules#step-triggers)[]',
  content: 'Block[]',
  blocks: 'Block[]',
  width: 'Dimension',
  height: 'Dimension',
  margin: 'Spacing',
  padding: 'Spacing',
  placement: 'Placement',
  target: 'Target',
  columns: 'Column[]',
};

/** Emit a markdown table for one object schema's top-level properties. */
function objTable(obj: JS, root: JS): string {
  const props = obj.properties ?? {};
  const required: string[] = obj.required ?? [];
  const rows = Object.entries(props)
    .filter(([k]) => k !== 'object') // drop the literal `object` discriminator marker
    .map(([k, raw]) => {
      const p = raw as JS;
      const req = required.includes(k) ? 'yes' : '';
      const desc = (p.description ?? '').replace(/\n/g, ' ').replace(/\|/g, '\\|');
      return `| \`${k}\` | ${NAMED[k] ?? typeLabel(p, root)} | ${req} | ${desc} |`;
    });
  if (!rows.length) return '_(no fields)_\n';
  const lines = ['| Field | Type | Required | Description |', '|---|---|---|---|', ...rows];
  return `${lines.join('\n')}\n`;
}

/** A union (anyOf/oneOf) discriminated by a `type` const → one section per member. */
function unionSections(schema: z.ZodType, skip: string[] = []): string {
  const root = toJson(schema);
  const members: JS[] = (root.anyOf ?? root.oneOf ?? []).map((m: JS) => deref(m, root));
  const out: string[] = [];
  for (const m of members) {
    const t = m.properties?.type?.const ?? m.properties?.kind?.const;
    if (!t || skip.includes(t)) continue;
    out.push(`#### \`${t}\`\n`);
    out.push(objTable(m, root));
    out.push('');
  }
  return out.join('\n');
}

function singleTable(schema: z.ZodType): string {
  const root = toJson(schema);
  return objTable(deref(root, root), root);
}

const group = process.argv[2] ?? 'blocks';
let md = '';
switch (group) {
  case 'blocks':
    md = unionSections(representationBlock, ['unsupported']);
    break;
  case 'questions':
    md = unionSections(representationQuestion);
    break;
  case 'conditions':
    md = unionSections(representationCondition, ['unsupported']);
    break;
  case 'actions':
    md = unionSections(representationAction, ['unsupported', 'run_javascript']);
    break;
  case 'rules':
    md = [
      `### startRules\n\n${singleTable(representationStartRules)}`,
      `### hideRules\n\n${singleTable(representationHideRules)}`,
      `### step (triggers live on a step)\n\n${singleTable(representationStepInput)}`,
    ].join('\n');
    break;
  case 'data':
    for (const [name, s] of [
      ['checklist', representationChecklist],
      ['launcher', representationLauncher],
      ['banner', representationBanner],
      ['tracker', representationTracker],
      ['resource-center', representationResourceCenter],
    ] as [string, z.ZodType][]) {
      md += `### ${name}\n\n${singleTable(s)}\n`;
    }
    break;
  default:
    console.error('unknown group:', group);
    process.exit(1);
}
console.log(md);
