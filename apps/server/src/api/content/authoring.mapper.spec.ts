import { decompileContent, decompileStep } from './authoring.mapper';
import { richTextToMarkdown } from './rich-text';

/** Pure decompiler — testable with plain internal-shape fixtures (no DB/DI). */

const slate = [
  {
    type: 'paragraph',
    children: [
      { text: 'Hi ' },
      { text: 'there', bold: true },
      {
        type: 'user-attribute',
        attrCode: 'first_name',
        fallback: 'friend',
        children: [{ text: '' }],
      },
      { text: '! See the ' },
      { type: 'link', url: 'https://x.io', children: [{ text: 'docs' }] },
    ],
  },
];

const el = (element: unknown, id?: string) => ({ id, element, children: null });
const column = (children: unknown[], element: unknown = { type: 'column' }, id?: string) => ({
  id,
  element,
  children,
});
const root = (columns: unknown[], id?: string) => ({
  id,
  element: { type: 'group' },
  children: columns,
});

describe('richTextToMarkdown', () => {
  it('renders bold, links, and user attributes as a Liquid subset', () => {
    expect(richTextToMarkdown(slate)).toBe(
      'Hi **there**{{ first_name | default: "friend" }}! See the [docs](https://x.io)',
    );
  });

  it('renders headings and lists', () => {
    const doc = [
      { type: 'h1', children: [{ text: 'Title' }] },
      {
        type: 'bulleted-list',
        children: [
          { type: 'list-item', children: [{ text: 'a' }] },
          { type: 'list-item', children: [{ text: 'b' }] },
        ],
      },
    ];
    expect(richTextToMarkdown(doc)).toBe('# Title\n\n- a\n- b');
  });

  it('returns empty string for non-array data', () => {
    expect(richTextToMarkdown(null)).toBe('');
  });
});

describe('decompileContent', () => {
  it('flattens a single-column row into blocks', () => {
    const data = [
      root([
        column([
          el({ type: 'text', data: slate }, 'b1'),
          el({ type: 'button', data: { text: 'Next', type: 'primary' } }, 'b2'),
        ]),
      ]),
    ];
    const { blocks, hasUnsupported } = decompileContent(data);
    expect(hasUnsupported).toBe(false);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toMatchObject({ object: 'block', id: 'b1', type: 'text' });
    expect(blocks[1]).toMatchObject({
      object: 'block',
      id: 'b2',
      type: 'button',
      text: 'Next',
      variant: 'primary',
    });
  });

  it('emits a columns block for multi-column rows (with per-column width)', () => {
    const data = [
      root(
        [
          column([el({ type: 'button', data: { text: 'Skip' } })], {
            type: 'column',
            width: { type: 'percent', value: 50 },
          }),
          column([el({ type: 'button', data: { text: 'Next' } })], {
            type: 'column',
            width: { type: 'fill' },
          }),
        ],
        'r1',
      ),
    ];
    const { blocks } = decompileContent(data);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ object: 'block', id: 'r1', type: 'columns' });
    const cols = (blocks[0] as any).columns;
    expect(cols[0].width).toEqual({ unit: 'percent', value: 50 });
    expect(cols[0].blocks[0]).toMatchObject({ type: 'button', text: 'Skip' });
    expect(cols[1].width).toEqual({ unit: 'fill' });
  });

  it('decompiles question elements into question blocks', () => {
    const data = [
      root([
        column([
          el({ type: 'nps', data: { cvid: 'q1', name: 'NPS', lowLabel: 'Lo', highLabel: 'Hi' } }),
          el({
            type: 'multiple-choice',
            data: {
              cvid: 'q2',
              name: 'Pick',
              options: [{ label: 'A', value: 'a' }],
              allowMultiple: true,
            },
          }),
        ]),
      ]),
    ];
    const { blocks } = decompileContent(data);
    expect(blocks[0]).toMatchObject({
      type: 'question',
      question: { kind: 'nps', name: 'NPS', cvid: 'q1', lowLabel: 'Lo', highLabel: 'Hi' },
    });
    expect(blocks[1]).toMatchObject({
      type: 'question',
      question: { kind: 'choice', allowMultiple: true, options: [{ label: 'A', value: 'a' }] },
    });
  });

  it('marks unknown elements unsupported', () => {
    const { blocks, hasUnsupported } = decompileContent([
      root([column([el({ type: 'mystery' })])]),
    ]);
    expect(hasUnsupported).toBe(true);
    expect(blocks[0]).toMatchObject({ type: 'unsupported', note: 'mystery' });
  });
});

describe('decompileStep', () => {
  it('decompiles a tooltip: target (selector), placement, width, content', () => {
    const step = {
      id: 's1',
      cvid: 'cv1',
      name: 'Welcome',
      type: 'tooltip',
      sequence: 0,
      data: [root([column([el({ type: 'text', data: slate })])])],
      target: { type: 'manual', customSelector: '.cta', sequence: '2st' },
      setting: { side: 'bottom', align: 'center', sideOffset: 8, width: 320, skippable: true },
    };
    const out = decompileStep(step);
    expect(out).toMatchObject({
      object: 'step',
      id: 's1',
      cvid: 'cv1',
      type: 'tooltip',
      target: { by: 'selector', selector: '.cta', nth: 1 },
      placement: { side: 'bottom', align: 'center', sideOffset: 8 },
      width: 320,
      skippable: true,
    });
    expect(out.content).toHaveLength(1);
  });

  it('flags a tooltip whose only target is the auto fingerprint as unsupported', () => {
    const step = {
      id: 's2',
      cvid: 'cv2',
      name: 'Auto',
      type: 'tooltip',
      sequence: 1,
      data: [],
      target: { type: 'auto', selectors: { tag: 'button' } },
      setting: {},
    };
    const out = decompileStep(step);
    expect(out.target).toBeUndefined();
    expect(out.advanced).toEqual({ hasUnsupported: true });
  });

  it('decompiles a modal: position placement, no target', () => {
    const step = {
      id: 's3',
      cvid: 'cv3',
      name: 'Modal',
      type: 'modal',
      sequence: 2,
      data: [],
      target: null,
      setting: { position: 'center', enabledBackdrop: true, positionOffsetX: 10 },
    };
    const out = decompileStep(step);
    expect(out.target).toBeUndefined();
    expect(out.placement).toEqual({ position: 'center', offsetX: 10, backdrop: true });
  });
});
