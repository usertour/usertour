import { compileContent, compileStep } from './representation.compile';
import { compileVersionData } from './version-data.compile';
import { decompileStep } from './representation.decompile';
import { representationCondition, representationStepInput } from './representation.schema';
import { compileText } from './text.compile';
import { decompileText } from './text.decompile';
import { extractLinkUrl } from '@usertour/helpers';
import { compileActions, compileConditions, CompileResolvers } from './rules.compile';
import { decompileContent } from './representation.decompile';
import { decompileActions, decompileWhen, IDENTITY_RESOLVERS } from './rules.decompile';

const ids: CompileResolvers = { attributeId: (c) => c, eventId: (c) => c };

describe('markdown round-trip', () => {
  it.each([
    'Hi **there**!',
    '# Title',
    '- a\n- b',
    'See [docs](https://x.io)',
    '{{ first_name | default: "friend" }}',
  ])('round-trips %p', (md) => {
    expect(decompileText(compileText(md))).toBe(md);
  });
});

describe('link compiles with `data` (so the runtime can derive its href)', () => {
  it('stores the URL as a Slate `data` value, not just a top-level `url`', () => {
    const blocks = compileText('See [docs](https://x.io) now') as any[];
    const link = (blocks[0].children as any[]).find((c) => c.type === 'link');
    expect(link).toBeDefined();
    expect(link.url).toBe('https://x.io');
    // The runtime (replaceUserAttr) does `url = data ? extract(data) : ''` — without
    // `data` the link renders href="". `data` must hold the URL as a Slate value.
    expect(Array.isArray(link.data)).toBe(true);
    expect(decompileText(link.data)).toBe('https://x.io');
  });

  it('round-trips a link through compile → decompile', () => {
    expect(decompileText(compileText('a [x](https://y.io) b'))).toBe('a [x](https://y.io) b');
  });

  it('parses a link nested in bold (**[x](url)**) as a bold link, not raw text', () => {
    const blocks = compileText('See **[changelog](https://x.io)** now') as any[];
    const link = (blocks[0].children as any[]).find((c) => c.type === 'link');
    expect(link).toBeDefined(); // the link is a real link node, not literal "[changelog](url)" text
    expect(link.url).toBe('https://x.io');
    expect(Array.isArray(link.data)).toBe(true);
    expect(link.children[0]).toMatchObject({ text: 'changelog', bold: true });
  });
});

describe('emphasis wrapping emphasis (**bold *italic* word**)', () => {
  // ASSERT THE SLATE MARKS, NOT THE ROUND-TRIP. A round-trip test passes here even when
  // compilation is broken: a buggy compile produced literal-asterisk text nodes
  // ([{"*"},{"bold ",italic},{"and-italic"},{" word",italic},{"*"}]) whose decompile
  // reconstructs the exact input string — `decompile(compile(x)) === x` while the
  // intermediate Slate is wrong, so the asterisks render literally. Only checking the
  // marks (or a real render) catches it.
  it('marks bold across the span and bold+italic on the nested word', () => {
    const blocks = compileText('**bold *italic* word**') as any[];
    const kids = blocks[0].children as any[];
    // no literal asterisks leaked into the rendered text
    expect(kids.some((k) => typeof k.text === 'string' && k.text.includes('*'))).toBe(false);
    expect(kids).toEqual([
      { text: 'bold ', bold: true },
      { text: 'italic', italic: true, bold: true },
      { text: ' word', bold: true },
    ]);
  });
});

describe('markdown-it migration: content preservation + plain-string path', () => {
  it('keeps a loose list item continuation paragraph (no dropped text)', () => {
    // A loose list item with a continuation paragraph: the first impl dropped every
    // block after the first paragraph (lost "continued text"). gatherInline keeps it.
    const out = decompileText(compileText('1. First line\n\n    continued text\n2. Second'));
    expect(out).toContain('First line');
    expect(out).toContain('continued text');
    expect(out).toContain('Second');
  });

  it('keeps markdown-significant chars literal in a link URL (no markdown parse)', () => {
    // The URL goes through compilePlainText, so `*`/`_` in it stay literal (not italic).
    const blocks = compileText('see [x](https://e.io/a*b_c)') as any[];
    const link = (blocks[0].children as any[]).find((c) => c.type === 'link');
    expect(link.url).toBe('https://e.io/a*b_c');
    expect(decompileText(link.data)).toBe('https://e.io/a*b_c');
  });

  it('protects a {{ liquid }} token that contains markdown characters', () => {
    const blocks = compileText('Hi {{ name | default: "*VIP*" }}!') as any[];
    const ua = (blocks[0].children as any[]).find((c) => c.type === 'user-attribute');
    expect(ua).toMatchObject({ type: 'user-attribute', attrCode: 'name', fallback: '*VIP*' });
  });
});

describe('navigate action compiles to the builder shape (data.value, not data.url)', () => {
  it('stores the URL as a Slate rich-text `value` the builder/runtime read', () => {
    const [rule] = compileActions([{ type: 'navigate', url: '/users' }], ids);
    expect((rule as any).type).toBe('page-navigate');
    // builder/runtime read data.value (serialized), NOT data.url
    expect((rule as any).data.value).toBeDefined();
    expect((rule as any).data.url).toBeUndefined();
    expect((rule as any).data.openType).toBe('same');
    // value serializes back to the URL
    expect(decompileText((rule as any).data.value)).toBe('/users');
  });

  it('round-trips through compile → decompile', () => {
    const compiled = compileActions([{ type: 'navigate', url: '/settings/appearance' }], ids);
    expect(decompileActions(compiled as never)).toEqual([
      { type: 'navigate', url: '/settings/appearance' },
    ]);
  });

  it('supports {{ attribute }} interpolation in the URL (runtime extractLinkUrl)', () => {
    const [rule] = compileActions(
      [{ type: 'navigate', url: '/users/{{ company_id | default: "0" }}' }],
      ids,
    );
    // the runtime resolves data.value against the user's attributes
    expect(extractLinkUrl((rule as any).data.value, { company_id: '42' })).toBe('/users/42');
    // falls back when the attribute is missing
    expect(extractLinkUrl((rule as any).data.value, {})).toBe('/users/0');
  });
});

describe('condition and/or (operators)', () => {
  // The runtime combines a condition list by reading `conditions[0].operators`
  // (a missing value falls through to OR). So compile MUST stamp the joiner or
  // an intended AND silently evaluates as OR.
  it('stamps operators=and on a top-level list (runtime ANDs, not ORs)', () => {
    const out = compileConditions(
      [
        { type: 'segment', segment: 's1', in: true },
        { type: 'segment', segment: 's2', in: true },
      ],
      ids,
    );
    expect(out.map((c: any) => c.operators)).toEqual(['and', 'and']);
  });

  it('stamps a group node with the parent joiner and its children with its match', () => {
    const [node]: any = compileConditions(
      [
        {
          type: 'group',
          match: 'any',
          conditions: [
            { type: 'segment', segment: 's1', in: true },
            { type: 'segment', segment: 's2', in: true },
          ],
        },
      ],
      ids,
    );
    expect(node.operators).toBe('and'); // group node = parent (top-level) joiner
    expect(node.conditions.map((c: any) => c.operators)).toEqual(['or', 'or']); // match:any → or
  });

  it('wraps a top-level OR list in an any-group and round-trips the OR', () => {
    const internalOr = [
      { type: 'segment', operators: 'or', data: { segmentId: 's1' } },
      { type: 'segment', operators: 'or', data: { segmentId: 's2' } },
    ];
    const when = decompileWhen(internalOr, IDENTITY_RESOLVERS);
    expect(when).toEqual([
      {
        type: 'group',
        match: 'any',
        conditions: [
          { type: 'segment', segment: 's1', in: true },
          { type: 'segment', segment: 's2', in: true },
        ],
      },
    ]);
    // compile back: a single top-level group whose children are OR-stamped —
    // semantically the same "s1 OR s2".
    const [node]: any = compileConditions(when, ids);
    expect(node.type).toBe('group');
    expect(node.conditions.map((c: any) => c.operators)).toEqual(['or', 'or']);
  });

  it('leaves a top-level AND list flat and a single condition unwrapped', () => {
    const and = decompileWhen(
      [
        { type: 'segment', operators: 'and', data: { segmentId: 's1' } },
        { type: 'segment', operators: 'and', data: { segmentId: 's2' } },
      ],
      IDENTITY_RESOLVERS,
    );
    expect(and.every((c) => c.type === 'segment')).toBe(true); // no wrap
    const single = decompileWhen(
      [{ type: 'segment', data: { segmentId: 's1' } }],
      IDENTITY_RESOLVERS,
    );
    expect(single).toEqual([{ type: 'segment', segment: 's1', in: true }]);
  });

  it('round-trips a nested AND-of-OR group without flattening or flipping the joiner', () => {
    // The headline branching-flow property: an `all` group containing an `any`
    // subgroup must survive compile → decompile unchanged — no flatten, no and↔or
    // flip — or targeting / disabledWhen logic silently changes meaning.
    const nested = [
      {
        type: 'group',
        match: 'all',
        conditions: [
          { type: 'segment', segment: 's1', in: true },
          {
            type: 'group',
            match: 'any',
            conditions: [
              { type: 'segment', segment: 's2', in: true },
              { type: 'segment', segment: 's3', in: true },
            ],
          },
        ],
      },
    ];
    const back = decompileWhen(compileConditions(nested as any, ids), IDENTITY_RESOLVERS);
    expect(back).toEqual(nested);
  });
});

describe('event_attribute + task_clicked conditions', () => {
  it('compiles task_clicked → internal task-is-clicked (parameterless)', () => {
    const [c]: any = compileConditions([{ type: 'task_clicked' }], ids);
    expect(c.type).toBe('task-is-clicked');
    expect(c.data).toEqual({});
  });

  it('compiles event_attribute via the event-scoped resolver (not the user one)', () => {
    const r = {
      attributeId: (code: string) => `user:${code}`,
      eventId: (code: string) => code,
      eventAttributeId: (code: string) => `event:${code}`,
    };
    const [c]: any = compileConditions(
      [{ type: 'event_attribute', attribute: 'price', op: 'is', value: '10' }],
      r as never,
    );
    expect(c.type).toBe('event-attr');
    expect(c.data.attrId).toBe('event:price'); // used eventAttributeId, not attributeId
    expect(c.data.value).toBe('10');
  });

  it('falls back to attributeId when no event resolver is supplied', () => {
    const [c]: any = compileConditions(
      [{ type: 'event_attribute', attribute: 'price', op: 'is' }],
      ids,
    );
    expect(c.data.attrId).toBe('price'); // identity fallback
  });
});

describe('dismiss compiles to the host content variant', () => {
  // Each renderer registers only its own dismiss handler; a mismatched type
  // finds no handler and silently no-ops. So the variant must follow the host.
  it('defaults to flow-dismis', () => {
    expect((compileActions([{ type: 'dismiss' }], ids)[0] as any).type).toBe('flow-dismis');
  });

  it('uses the supplied variant for checklist / banner / launcher', () => {
    const variant = (v: any) => (compileActions([{ type: 'dismiss' }], ids, v)[0] as any).type;
    expect(variant('checklist-dismis')).toBe('checklist-dismis');
    expect(variant('banner-dismis')).toBe('banner-dismis');
    expect(variant('launcher-dismis')).toBe('launcher-dismis');
  });

  it('threads the variant into content-block button actions', () => {
    const content: any = compileContent(
      [{ object: 'block', type: 'button', text: 'Close', actions: [{ type: 'dismiss' }] }] as any,
      undefined,
      ids,
      'banner-dismis',
    );
    const action = content[0].children[0].children[0].element.data.actions[0];
    expect(action.type).toBe('banner-dismis');
  });
});

describe('question cvid is honored (analytics identity survives edits)', () => {
  const cvidOf = (content: any) => content[0].children[0].children[0].element.data.cvid;

  it('uses the echoed question cvid even with no existing block to match', () => {
    // A maintainer reads a version and writes it back: the question's cvid (its
    // analytics identity) must be kept, not regenerated, even when block ids churn.
    const content: any = compileContent(
      [
        {
          object: 'block',
          type: 'question',
          question: { kind: 'nps', name: 'Q', cvid: 'keep-me' },
        },
      ] as any,
      undefined,
      ids,
    );
    expect(cvidOf(content)).toBe('keep-me');
  });

  it('generates a cvid when none is echoed and nothing matches', () => {
    const content: any = compileContent(
      [{ object: 'block', type: 'question', question: { kind: 'nps', name: 'Q' } }] as any,
      undefined,
      ids,
    );
    expect(typeof cvidOf(content)).toBe('string');
    expect(cvidOf(content).length).toBeGreaterThan(0);
  });
});

describe('compileStep → decompileStep round-trip', () => {
  it('preserves target, placement, width, content, triggers', () => {
    const representation = {
      object: 'step' as const,
      id: 's1',
      cvid: 'cv1',
      name: 'Welcome',
      type: 'tooltip',
      sequence: 0,
      target: { selector: '.cta' },
      placement: { side: 'bottom' as const, align: 'center' as const },
      width: 320,
      content: [
        { object: 'block' as const, type: 'text' as const, markdown: 'Hi **there**' },
        {
          object: 'block' as const,
          type: 'button' as const,
          text: 'Next',
          variant: 'primary' as const,
        },
      ],
      triggers: [{ do: [{ type: 'dismiss' as const }] }],
    };
    const compiled = compileStep(representation as any, undefined, ids);
    const back = decompileStep({
      id: 's1',
      cvid: compiled.cvid,
      name: 'Welcome',
      type: 'tooltip',
      sequence: 0,
      data: compiled.data,
      target: compiled.target,
      setting: compiled.setting,
      trigger: compiled.trigger,
    });

    expect(back.target).toEqual({ selector: '.cta' });
    expect(back.placement).toMatchObject({ side: 'bottom', align: 'center' });
    expect(back.width).toBe(320);
    expect(back.content[0]).toMatchObject({ type: 'text', markdown: 'Hi **there**' });
    expect(back.content[1]).toMatchObject({ type: 'button', text: 'Next', variant: 'primary' });
    expect(back.triggers).toEqual([{ do: [{ type: 'dismiss' }] }]);
  });

  // Regression: both fields are consumed by compileStep and emitted by decompile,
  // but were absent from the write schema (representationStepInput), so zod silently
  // stripped them on write — readable yet not writable. They must now survive parse.
  it('write input keeps onClick + explicitCompletionStep through parse → compile → decompile', () => {
    const parsed = representationStepInput.parse({
      name: 'Click the CTA',
      type: 'tooltip',
      target: { selector: '.cta' },
      explicitCompletionStep: true,
      onClick: [{ type: 'goto_step', step: 'next' }],
    });

    // the write boundary must not strip them
    expect(parsed.explicitCompletionStep).toBe(true);
    expect(parsed.onClick).toEqual([{ type: 'goto_step', step: 'next' }]);

    const compiled = compileStep(
      { ...parsed, cvid: 'cv1', sequence: 0, content: parsed.content } as any,
      undefined,
      ids,
    );

    // onClick → target.actions (the SDK reads currentStep.target.actions)
    expect((compiled.target as any).actions).toHaveLength(1);
    expect((compiled.target as any).actions[0].type).toBe('step-goto');
    expect((compiled.target as any).actions[0].data.stepCvid).toBe('next');
    // explicitCompletionStep → setting
    expect((compiled.setting as any).explicitCompletionStep).toBe(true);

    // and both round-trip back out on read
    const back = decompileStep({
      id: 's1',
      cvid: compiled.cvid,
      name: 'Click the CTA',
      type: 'tooltip',
      sequence: 0,
      data: compiled.data,
      target: compiled.target,
      setting: compiled.setting,
      trigger: compiled.trigger,
    });
    expect(back.explicitCompletionStep).toBe(true);
    expect(back.onClick).toEqual([{ type: 'goto_step', step: 'next' }]);
  });
});

describe('per-step themeId override (set / preserve / clear / inherit)', () => {
  const parse = (themeId?: string | null) =>
    representationStepInput.parse({
      name: 'S',
      type: 'tooltip',
      ...(themeId !== undefined ? { themeId } : {}),
    });

  it('sets a per-step theme on create', () => {
    const compiled = compileStep(
      { ...parse('t1'), cvid: 'cv1', sequence: 0, content: [] } as any,
      undefined,
      ids,
    );
    expect(compiled.themeId).toBe('t1');
  });

  it('omitting themeId preserves the existing override (field-merge)', () => {
    const compiled = compileStep(
      { ...parse(undefined), cvid: 'cv1', sequence: 0, content: [] } as any,
      { cvid: 'cv1', themeId: 't1' } as any,
      ids,
    );
    expect(compiled.themeId).toBe('t1');
  });

  it('explicit null clears the override (inherit the version theme)', () => {
    const compiled = compileStep(
      { ...parse(null), cvid: 'cv1', sequence: 0, content: [] } as any,
      { cvid: 'cv1', themeId: 't1' } as any,
      ids,
    );
    expect(compiled.themeId).toBeNull();
  });

  it('decompile emits themeId (null when the step has no override)', () => {
    const back = decompileStep({ id: 's1', cvid: 'cv1', name: 'S', type: 'tooltip', sequence: 0 });
    expect(back.themeId).toBeNull();
  });
});

describe('field-level merge', () => {
  it('preserves element styling, target fingerprint, and setting offsets', () => {
    const existing = {
      cvid: 'cv1',
      data: [
        {
          id: 'r1',
          element: { type: 'group' },
          children: [
            {
              id: 'c1',
              element: { type: 'column' },
              children: [
                {
                  id: 'b1',
                  element: { type: 'image', url: 'old.png', width: { type: 'percent', value: 50 } },
                  children: null,
                },
              ],
            },
          ],
        },
      ],
      target: { type: 'auto', selectors: { tag: 'button' } },
      setting: { side: 'top', align: 'start', sideOffset: 99 },
    };
    const representation = {
      object: 'step' as const,
      id: 's1',
      cvid: 'cv1',
      name: 'X',
      type: 'tooltip',
      sequence: 0,
      placement: { side: 'bottom' as const, align: 'center' as const },
      content: [{ object: 'block' as const, id: 'b1', type: 'image' as const, url: 'new.png' }],
    };
    const compiled: any = compileStep(representation as any, existing, ids);

    const imageEl = compiled.data[0].children[0].children[0].element;
    expect(imageEl.url).toBe('new.png'); // overwritten
    expect(imageEl.width).toEqual({ type: 'percent', value: 50 }); // preserved styling

    // no representation target → the internal "auto" fingerprint is preserved
    expect(compiled.target).toEqual({ type: 'auto', selectors: { tag: 'button' } });
    // setting offset preserved, side/align overwritten
    expect(compiled.setting).toMatchObject({ side: 'bottom', align: 'center', sideOffset: 99 });
  });
});

describe('target field-merge on write-back', () => {
  const stepRep = (target: unknown) =>
    ({
      object: 'step' as const,
      id: 's1',
      cvid: 'cv1',
      name: 'X',
      type: 'tooltip',
      sequence: 0,
      target,
      content: [{ object: 'block' as const, type: 'text' as const, markdown: 'Hi' }],
    }) as never;

  it('preserves target.actions (click-to-advance) the representation cannot model', () => {
    const existing = {
      cvid: 'cv1',
      target: {
        type: 'manual',
        customSelector: '.cta',
        actions: [{ type: 'step-goto', data: { stepCvid: 'x' } }],
        selectors: { tag: 'button' },
        precision: 'stricter',
      },
    };
    const compiled: any = compileStep(stepRep({ selector: '.cta' }), existing as never, ids);
    expect(compiled.target.actions).toEqual([{ type: 'step-goto', data: { stepCvid: 'x' } }]);
    expect(compiled.target.customSelector).toBe('.cta');
    expect(compiled.target.precision).toBe('stricter'); // unused-but-preserved fingerprint
  });

  it('writes target.content from the representation `text` (selector + text)', () => {
    const compiled: any = compileStep(stepRep({ selector: '.cta', text: 'Hello' }), undefined, ids);
    expect(compiled.target.customSelector).toBe('.cta');
    expect(compiled.target.content).toBe('Hello');
  });

  it('drops stale target.content when the representation omits `text`', () => {
    const existing = {
      cvid: 'cv1',
      target: { type: 'manual', customSelector: '.old', content: 'Old text' },
    };
    const compiled: any = compileStep(stepRep({ selector: '.new' }), existing as never, ids);
    expect(compiled.target.customSelector).toBe('.new');
    expect(compiled.target.content).toBeUndefined();
  });
});

describe('element + column styling round-trip', () => {
  it('round-trips column justify/align/padding (styled single column stays a columns block)', () => {
    const rep = [
      {
        object: 'block' as const,
        type: 'columns' as const,
        columns: [
          {
            // `start` is a non-default justify (the column default is now center) so it
            // round-trips explicitly; center would be omitted on read as the default.
            justify: 'start' as const,
            align: 'end' as const,
            padding: { top: 8 },
            blocks: [{ object: 'block' as const, type: 'text' as const, markdown: 'Hi' }],
          },
        ],
      },
    ];
    const internal: any = compileContent(rep as never, undefined, ids);
    const colEl = internal[0].children[0].element;
    expect(colEl.justifyContent).toBe('justify-start');
    expect(colEl.alignItems).toBe('items-end');
    expect(colEl.padding).toMatchObject({ enabled: true, top: 8 });
    const back: any = decompileContent(internal).blocks;
    expect(back[0].type).toBe('columns');
    expect(back[0].columns[0]).toMatchObject({
      justify: 'start',
      align: 'end',
      padding: { top: 8 },
    });
  });

  it('round-trips image width + margin', () => {
    const rep = [
      {
        object: 'block' as const,
        type: 'image' as const,
        url: 'x.png',
        width: { unit: 'pixels' as const, value: 200 },
        margin: { top: 4, bottom: 4 },
      },
    ];
    const internal: any = compileContent(rep as never, undefined, ids);
    const img = internal[0].children[0].children[0].element;
    expect(img.width).toEqual({ type: 'pixels', value: 200 });
    expect(img.margin).toMatchObject({ enabled: true, top: 4, bottom: 4 });
    const back: any = decompileContent(internal).blocks;
    expect(back[0]).toMatchObject({
      type: 'image',
      width: { unit: 'pixels', value: 200 },
      margin: { top: 4, bottom: 4 },
    });
  });

  it('still flattens a plain (unstyled) single column to a bare block', () => {
    const internal: any = compileContent(
      [{ object: 'block', type: 'text', markdown: 'Hi' }] as never,
      undefined,
      ids,
    );
    const back: any = decompileContent(internal).blocks;
    expect(back[0].type).toBe('text'); // not wrapped in a columns block
  });
});

describe('step explicitCompletionStep', () => {
  it('round-trips through setting', () => {
    const rep = {
      object: 'step' as const,
      id: 's1',
      cvid: 'cv1',
      name: 'X',
      type: 'modal',
      sequence: 0,
      content: [],
      explicitCompletionStep: true,
    };
    const compiled = compileStep(rep as never, undefined, ids);
    expect((compiled.setting as any).explicitCompletionStep).toBe(true);
    const back = decompileStep({
      id: 's1',
      cvid: compiled.cvid,
      name: 'X',
      type: 'modal',
      sequence: 0,
      data: compiled.data,
      target: compiled.target,
      setting: compiled.setting,
      trigger: compiled.trigger,
    });
    expect(back.explicitCompletionStep).toBe(true);
  });
});

describe('step setting: builder defaults seeded on create (SDK needs them)', () => {
  const mk = (type: string, placement?: unknown) => ({
    object: 'step' as const,
    id: 's',
    cvid: 'cv',
    name: 'X',
    type,
    sequence: 0,
    content: [],
    ...(placement ? { placement } : {}),
  });

  it('defaults a modal with no placement to position:center (else SDK anchors it off-screen)', () => {
    const compiled = compileStep(mk('modal') as never, undefined, ids);
    expect((compiled.setting as any).position).toBe('center');
  });

  it('keeps an author-set modal corner position', () => {
    const compiled = compileStep(mk('modal', { position: 'rightBottom' }) as never, undefined, ids);
    expect((compiled.setting as any).position).toBe('rightBottom');
  });

  it('a tooltip that provides side/align derives alignType:fixed (honor the direction)', () => {
    const compiled = compileStep(
      mk('tooltip', { side: 'right', align: 'center' }) as never,
      undefined,
      ids,
    );
    const s = compiled.setting as any;
    expect(s.side).toBe('right'); // authored value wins
    expect(s.align).toBe('center');
    expect(s.skippable).toBe(true); // builder default → close button
    // Providing a direction pins it: runtime ignores side/align in `auto`, so
    // compile derives `fixed` to make the authored direction actually render.
    expect(s.alignType).toBe('fixed');
  });

  it('a tooltip with NO placement keeps the seeded alignType:auto (auto-position + flip)', () => {
    const compiled = compileStep(mk('tooltip', undefined) as never, undefined, ids);
    const s = compiled.setting as any;
    // No side/align given → leave the builder default: auto-position and flip to
    // avoid the viewport edge (the safety net when the author can't see the element).
    expect(s.alignType).toBe('auto');
  });

  it('round-trips tooltip backdrop / blockTarget / fixed alignType', () => {
    const rep = {
      object: 'step' as const,
      id: 's',
      cvid: 'cv',
      name: 'X',
      type: 'tooltip',
      sequence: 0,
      content: [],
      placement: {
        side: 'top',
        align: 'start',
        alignType: 'fixed',
        backdrop: true,
        blockTarget: true,
      },
    };
    const compiled = compileStep(rep as never, undefined, ids);
    const s = compiled.setting as any;
    expect(s.enabledBackdrop).toBe(true);
    expect(s.enabledBlockTarget).toBe(true);
    expect(s.alignType).toBe('fixed');
    const back = decompileStep({
      id: 's',
      cvid: compiled.cvid,
      name: 'X',
      type: 'tooltip',
      sequence: 0,
      data: compiled.data,
      target: compiled.target,
      setting: compiled.setting,
      trigger: compiled.trigger,
    });
    expect(back.placement as any).toMatchObject({
      side: 'top',
      align: 'start',
      alignType: 'fixed',
      backdrop: true,
      blockTarget: true,
    });
  });

  it('does NOT reseed defaults on update (existing setting is the faithful base)', () => {
    // An existing step whose setting lacks `skippable` must stay that way on update.
    const compiled = compileStep(
      mk('tooltip', { side: 'top', align: 'start' }) as never,
      {
        cvid: 'cv',
        setting: { side: 'bottom', align: 'center' },
      } as never,
      ids,
    );
    expect((compiled.setting as any).skippable).toBeUndefined();
    expect((compiled.setting as any).side).toBe('top'); // authored override still applies
  });
});

describe('target onClick (click-to-advance)', () => {
  const stepWithOnClick = {
    object: 'step' as const,
    id: 's1',
    cvid: 'cv1',
    name: 'X',
    type: 'tooltip',
    sequence: 0,
    target: { selector: '.cta' },
    content: [{ object: 'block' as const, type: 'text' as const, markdown: 'Hi' }],
    onClick: [{ type: 'goto_step' as const, step: 's2' }],
  };

  it('compiles step.onClick into target.actions (the SDK click-to-advance field)', () => {
    const compiled: any = compileStep(stepWithOnClick as never, undefined, ids);
    expect(compiled.target.actions[0].type).toBe('step-goto');
    expect(compiled.target.actions[0].data.stepCvid).toBe('s2');
  });

  it('round-trips onClick (decompile target.actions → onClick)', () => {
    const compiled: any = compileStep(stepWithOnClick as never, undefined, ids);
    const back = decompileStep({
      id: 's1',
      cvid: compiled.cvid,
      name: 'X',
      type: 'tooltip',
      sequence: 0,
      data: compiled.data,
      target: compiled.target,
      setting: compiled.setting,
      trigger: compiled.trigger,
    });
    expect(back.onClick).toEqual([{ type: 'goto_step', step: 's2' }]);
  });
});

describe('text Slate field-merge on write-back', () => {
  const textStep = (markdown: string) =>
    ({
      object: 'step' as const,
      id: 's1',
      cvid: 'cv1',
      name: 'X',
      type: 'modal',
      sequence: 0,
      content: [{ object: 'block' as const, id: 't1', type: 'text' as const, markdown }],
    }) as never;
  // existing Slate carries an `align` mark markdown can't express.
  const slate = compileText('Hi') as any[];
  (slate[0] as any).align = 'center';
  const existing = {
    cvid: 'cv1',
    data: [
      {
        id: 'b1',
        element: { type: 'group' },
        children: [
          {
            id: 'c1',
            element: { type: 'column' },
            children: [{ id: 't1', element: { type: 'text', data: slate } }],
          },
        ],
      },
    ],
  };

  it('keeps the original Slate (align/color) when the markdown is unchanged', () => {
    const compiled: any = compileStep(textStep('Hi'), existing as never, ids);
    const el = compiled.data[0].children[0].children[0].element;
    expect(el.data[0].align).toBe('center'); // preserved across write-back
  });

  it('regenerates the Slate (marks reset) when the markdown was rewritten', () => {
    const compiled: any = compileStep(textStep('Bye'), existing as never, ids);
    const el = compiled.data[0].children[0].children[0].element;
    expect(el.data[0].align).toBeUndefined(); // reset — markdown changed
    expect(decompileText(el.data)).toBe('Bye');
  });
});

describe('run_javascript is write-rejected', () => {
  it('throws when an action is run_javascript', () => {
    const representation = {
      object: 'step' as const,
      id: 's1',
      name: 'X',
      type: 'tooltip',
      sequence: 0,
      content: [],
      triggers: [{ do: [{ type: 'run_javascript' as const, script: 'alert(1)' }] }],
    };
    expect(() => compileStep(representation as any, undefined, ids)).toThrow();
  });
});

describe('condition type is a discriminated union (clean errors)', () => {
  it('rejects an unknown condition type with one discriminator error listing valid types', () => {
    // `user_attribute` is the natural-but-wrong guess for an attribute condition.
    // A z.union would dump every branch; the discriminated union gives one message.
    const r = representationCondition.safeParse({
      type: 'user_attribute',
      attribute: 'plan',
      op: 'is',
      value: 'pro',
    });
    expect(r.success).toBe(false);
    const issues = r.success ? '' : JSON.stringify(r.error.issues);
    expect(issues).toMatch(/discriminator/i);
    expect(issues).toContain('attribute'); // names the correct type in the options
  });

  it('accepts the correct attribute + scope shape', () => {
    const r = representationCondition.safeParse({
      type: 'attribute',
      scope: 'user',
      attribute: 'plan',
      op: 'is',
      value: 'pro',
    });
    expect(r.success).toBe(true);
  });
});

describe('question blocks are flow-only', () => {
  it('rejects a question block in a non-flow (checklist) data body', () => {
    // ValidationError keeps its text in getMessage()/toString(), not native .message.
    let msg = '';
    try {
      compileVersionData(
        'checklist',
        { content: [{ type: 'question', question: { kind: 'nps', name: 'Q' } }], items: [] },
        undefined,
        ids,
      );
    } catch (e) {
      msg = String(e);
    }
    expect(msg).toMatch(/only supported in flows/i);
  });
});
