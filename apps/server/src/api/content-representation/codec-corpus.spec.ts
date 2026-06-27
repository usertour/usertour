import { compileStep } from './representation.compile';
import { decompileStep } from './representation.decompile';
import { compileText } from './text.compile';
import { decompileText } from './text.decompile';
import { compileVersionData } from './version-data.compile';
import { decompileVersionData } from './version-data.decompile';

/**
 * Codec faithfulness corpus — the permanent home for what the one-off prod-dump
 * round-trip sweeps verified (B3 + the markdown-it migration): real-shaped content
 * must survive decompile↔compile with ZERO corruption. Curated synthetic fixtures
 * (no prod data) spanning the shape matrix + every pattern that has caught a real
 * bug. The invariant is IDEMPOTENCE: the codec must be a fixpoint after the first
 * normalization (a one-time normalization is fine; drift on a second round is a bug).
 * NOTE: round-trip alone can be fooled (a buggy compile whose garbage decompiles back
 * to the same string) — so the structural assertions in representation.compile.spec
 * (marks, link data) are the companion guard; this file is the breadth net.
 */
const ids = { attributeId: (c: string) => c, eventId: (c: string) => c } as never;
const idR = { attributeCode: (i: string) => i, eventCode: (i: string) => i } as never;

// Server-owned ids (a step/question `cvid`, a block `id`) are freshly generated on a
// from-scratch compile — preserved only across UPDATES via the field-level merge, not
// echoed from the representation. The faithfulness invariant is "stable modulo those
// ids", so strip them before comparing (same as the B3 prod sweep: ids/cvids stripped).
const stripIds = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(stripIds);
  if (v && typeof v === 'object') {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>)
        .filter(([k]) => k !== 'cvid' && k !== 'id')
        .map(([k, x]) => [k, stripIds(x)]),
    );
  }
  return v;
};

// ── Markdown / text (where every recent codec bug lived) ────────────────────────
describe('codec corpus: markdown text is round-trip idempotent', () => {
  const norm = (md: string) => decompileText(compileText(md));
  const CORPUS: [string, string][] = [
    ['plain', 'Just a sentence.'],
    ['bold + italic', 'Some **bold** and *italic* words.'],
    ['nested emphasis', '**bold *italic* word**'],
    ['bold link', 'See **[changelog](https://x.io/changelog)** now'],
    ['italic link', 'Read *[the docs](https://docs.x.io)* please'],
    ['url with markdown chars', 'Open [it](https://x.io/a_b*c/d) here'],
    ['headings', '# Title\n\n## Subtitle'],
    ['bulleted list', '- alpha\n- beta\n- gamma'],
    ['numbered list', '1. first\n2. second\n3. third'],
    ['loose list continuation', '1. Pick one\n\n    then confirm\n2. Done'],
    ['code fence', '```\nconst x = 1;\n```'],
    ['liquid', 'Hi {{ first_name | default: "friend" }}!'],
    ['liquid with markdown chars', 'Plan: {{ plan | default: "*VIP*" }} now'],
    [
      'mixed everything',
      '# Welcome\n\nA paragraph with **bold**, *italic*, a [link](https://x.io) and {{ name }}.\n\n- item *one*\n- item **two**',
    ],
  ];

  it.each(CORPUS)('%s is a fixpoint', (_label, md) => {
    const once = norm(md);
    expect(norm(once)).toBe(once);
  });

  it('no fixture leaks a literal markdown asterisk into the rendered text', () => {
    // compiled Slate's leaf text must never contain a raw `*` (the nested-emphasis trap)
    const leakText = (nodes: any[]): string =>
      nodes
        .map((n) =>
          typeof n.text === 'string'
            ? n.text
            : Array.isArray(n.children)
              ? leakText(n.children)
              : '',
        )
        .join('');
    for (const [, md] of CORPUS) {
      const blocks = compileText(md) as any[];
      expect(leakText(blocks)).not.toContain('*');
    }
  });
});

// ── Flow steps (the bulk of real Step.data: content blocks + conditions + triggers) ──
describe('codec corpus: flow steps are round-trip idempotent', () => {
  const meta = { id: 'sx', name: 'Step', sequence: 0 };
  const roundTrip = (rep: any, type: string) => {
    const c: any = compileStep({ ...rep, ...meta, type }, undefined, ids);
    return decompileStep({
      ...meta,
      type,
      cvid: c.cvid,
      data: c.data,
      target: c.target,
      setting: c.setting,
      trigger: c.trigger,
    } as never);
  };

  const STEPS: [string, string, any][] = [
    [
      'modal: rich text + buttons',
      'modal',
      {
        placement: { position: 'center' },
        content: [
          { object: 'block', type: 'text', markdown: 'Hello **there** — *welcome*' },
          {
            object: 'block',
            type: 'button',
            text: 'Next',
            variant: 'primary',
            actions: [{ type: 'dismiss' }],
          },
        ],
      },
    ],
    [
      'tooltip: target + placement + trigger',
      'tooltip',
      {
        target: { selector: '.cta', nth: 1 },
        placement: { side: 'bottom', align: 'center' },
        width: 320,
        content: [{ object: 'block', type: 'text', markdown: 'Click here' }],
        triggers: [
          {
            when: [{ type: 'current_url', includes: ['*/app/*'] }],
            do: [{ type: 'dismiss' }],
          },
        ],
      },
    ],
    [
      'modal: nps question bound to an attribute',
      'modal',
      {
        placement: { position: 'center' },
        content: [
          { object: 'block', type: 'text', markdown: 'How likely to recommend?' },
          {
            object: 'block',
            type: 'question',
            question: { kind: 'nps', name: 'NPS', bindAttribute: 'nps_score' },
          },
        ],
      },
    ],
    [
      'modal: columns + image',
      'modal',
      {
        placement: { position: 'center' },
        content: [
          {
            object: 'block',
            type: 'columns',
            columns: [
              { blocks: [{ object: 'block', type: 'text', markdown: 'Left' }] },
              { blocks: [{ object: 'block', type: 'image', url: 'https://x.io/a.png', alt: 'a' }] },
            ],
          },
        ],
      },
    ],
    [
      'tooltip: onClick + grouped conditions',
      'tooltip',
      {
        target: { selector: 'a[href="/tasks"]' },
        placement: { side: 'right', align: 'start' },
        content: [{ object: 'block', type: 'text', markdown: 'Go to tasks' }],
        onClick: [{ type: 'dismiss' }],
        triggers: [
          {
            when: [
              {
                type: 'group',
                match: 'all',
                conditions: [
                  { type: 'attribute', scope: 'user', attribute: 'plan', op: 'is', value: 'pro' },
                  { type: 'flow', flow: 'flow-1', state: 'completed' },
                ],
              },
            ],
            do: [{ type: 'navigate', url: '/tasks' }],
          },
        ],
      },
    ],
  ];

  it.each(STEPS)('%s is a fixpoint', (_label, type, rep) => {
    const r1 = roundTrip(rep, type);
    const r2 = roundTrip(r1, type);
    expect(stripIds(r2)).toEqual(stripIds(r1));
  });
});

// ── Non-flow version data (checklist / resource-center / banner) ─────────────────
describe('codec corpus: non-flow version data is round-trip idempotent', () => {
  const roundTrip = (type: string, rep: any) =>
    decompileVersionData(type, compileVersionData(type, rep, undefined, ids), idR);

  const DATA: [string, string, any][] = [
    [
      'checklist',
      'checklist',
      {
        buttonText: 'Get started',
        initialDisplay: 'expanded',
        completionOrder: 'any',
        content: [{ object: 'block', type: 'text', markdown: 'Finish these **steps**' }],
        items: [
          {
            name: 'Create a task',
            completeWhen: [{ type: 'task_clicked' }],
            clickActions: [{ type: 'navigate', url: '/tasks' }],
          },
        ],
      },
    ],
    [
      'resource-center',
      'resource-center',
      {
        buttonText: 'Help',
        tabs: [
          {
            name: 'Guides',
            blocks: [
              {
                type: 'richtext',
                content: [{ object: 'block', type: 'text', markdown: 'Read **this**' }],
              },
              { type: 'divider' },
            ],
          },
        ],
      },
    ],
    [
      'banner',
      'banner',
      {
        placement: 'top-of-page',
        content: [{ object: 'block', type: 'text', markdown: 'Heads up: *new* feature' }],
      },
    ],
  ];

  it.each(DATA)('%s is a fixpoint', (_label, type, rep) => {
    const r1 = roundTrip(type, rep);
    const r2 = roundTrip(type, r1);
    expect(r2).toEqual(r1);
  });
});
