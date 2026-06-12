import { compileStep } from './representation.compile';
import { decompileStep } from './representation.decompile';
import { compileText } from './text.compile';
import { decompileText } from './text.decompile';
import { extractLinkUrl } from '@usertour/helpers';
import { compileActions, CompileResolvers } from './rules.compile';
import { decompileActions } from './rules.decompile';

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
