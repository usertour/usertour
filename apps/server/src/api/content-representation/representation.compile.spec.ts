import { compileContent, compileStep } from './representation.compile';
import { decompileStep } from './representation.decompile';
import { compileText } from './text.compile';
import { decompileText } from './text.decompile';
import { extractLinkUrl } from '@usertour/helpers';
import { compileActions, compileConditions, CompileResolvers } from './rules.compile';
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

describe('compileStep → decompileStep round-trip', () => {
  it('preserves target, placement, width, content, triggers', () => {
    const representation = {
      object: 'step' as const,
      id: 's1',
      cvid: 'cv1',
      name: 'Welcome',
      type: 'tooltip',
      sequence: 0,
      target: { by: 'selector' as const, selector: '.cta' },
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

    expect(back.target).toEqual({ by: 'selector', selector: '.cta' });
    expect(back.placement).toMatchObject({ side: 'bottom', align: 'center' });
    expect(back.width).toBe(320);
    expect(back.content[0]).toMatchObject({ type: 'text', markdown: 'Hi **there**' });
    expect(back.content[1]).toMatchObject({ type: 'button', text: 'Next', variant: 'primary' });
    expect(back.triggers).toEqual([{ do: [{ type: 'dismiss' }] }]);
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
    const compiled: any = compileStep(
      stepRep({ by: 'selector', selector: '.cta' }),
      existing as never,
      ids,
    );
    expect(compiled.target.actions).toEqual([{ type: 'step-goto', data: { stepCvid: 'x' } }]);
    expect(compiled.target.customSelector).toBe('.cta');
    expect(compiled.target.precision).toBe('stricter'); // unused-but-preserved fingerprint
  });

  it('keeps target.content when the selector is unchanged', () => {
    const existing = {
      cvid: 'cv1',
      target: { type: 'manual', customSelector: '.cta', content: 'Hello' },
    };
    const compiled: any = compileStep(
      stepRep({ by: 'selector', selector: '.cta' }),
      existing as never,
      ids,
    );
    expect(compiled.target.content).toBe('Hello');
  });

  it('drops stale target.content when the selector changes (would reject the new element)', () => {
    const existing = {
      cvid: 'cv1',
      target: { type: 'manual', customSelector: '.old', content: 'Old text' },
    };
    const compiled: any = compileStep(
      stepRep({ by: 'selector', selector: '.new' }),
      existing as never,
      ids,
    );
    expect(compiled.target.customSelector).toBe('.new');
    expect(compiled.target.content).toBeUndefined();
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
    target: { by: 'selector' as const, selector: '.cta' },
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
