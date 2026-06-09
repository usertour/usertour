import { ApiObjectType } from '../shared/object-type';
import {
  AuthoringBlock,
  AuthoringPlacement,
  AuthoringQuestion,
  AuthoringStep,
  AuthoringTarget,
} from './authoring.schema';
import { richTextToMarkdown } from './rich-text';

/** Internal step row, untyped at the relation boundary (generic Prisma include). */
type StepNode = {
  id: string;
  cvid: string | null;
  name: string | null;
  type: string | null;
  sequence: number;
  data?: unknown;
  target?: unknown;
  setting?: unknown;
  trigger?: unknown;
};

const SIDES = new Set(['top', 'right', 'bottom', 'left']);
const ALIGNS = new Set(['start', 'center', 'end']);
const POSITIONS = new Set(['center', 'top', 'bottom', 'left', 'right']);

/**
 * Decompile an internal step into the authoring step: identity + target +
 * placement + content blocks. (Rules — triggers / button & answer actions — are
 * layered on in a later pass.)
 */
export function decompileStep(step: StepNode): AuthoringStep {
  const { blocks, hasUnsupported: contentUnsupported } = decompileContent(step.data);
  const target = decompileTarget(step.target);
  const placement = decompilePlacement(step.setting, step.type ?? '');
  const setting = (step.setting ?? {}) as Record<string, unknown>;

  // A tooltip whose only targeting is the internal "auto" fingerprint can't be
  // represented — flag it so consumers know the target is opaque.
  const targetUnsupported = step.type === 'tooltip' && !target && hasAutoTarget(step.target);
  const hasUnsupported = contentUnsupported || targetUnsupported;

  return {
    object: ApiObjectType.STEP,
    id: step.id,
    cvid: step.cvid ?? null,
    name: step.name ?? '',
    type: step.type ?? '',
    sequence: step.sequence,
    ...(target ? { target } : {}),
    ...(placement ? { placement } : {}),
    ...(typeof setting.width === 'number' ? { width: setting.width } : {}),
    ...(typeof setting.skippable === 'boolean' ? { skippable: setting.skippable } : {}),
    content: blocks,
    ...(hasUnsupported ? { advanced: { hasUnsupported: true } } : {}),
  };
}

// ── Content blocks ───────────────────────────────────────────────────────────

/** ContentEditorRoot[] → flat block list (multi-column rows → a `columns` block). */
export function decompileContent(data: unknown): {
  blocks: AuthoringBlock[];
  hasUnsupported: boolean;
} {
  const roots = Array.isArray(data) ? data : [];
  const blocks: AuthoringBlock[] = [];
  let hasUnsupported = false;

  for (const root of roots) {
    const columns: unknown[] = Array.isArray(root?.children) ? root.children : [];
    if (columns.length <= 1) {
      const elements: unknown[] = Array.isArray((columns[0] as any)?.children)
        ? (columns[0] as any).children
        : [];
      for (const el of elements) {
        const { block, unsupported } = decompileElement(el);
        hasUnsupported = hasUnsupported || unsupported;
        blocks.push(block);
      }
    } else {
      const cols = columns.map((col: any) => {
        const colBlocks: AuthoringBlock[] = (Array.isArray(col?.children) ? col.children : []).map(
          (el: unknown) => {
            const { block, unsupported } = decompileElement(el);
            hasUnsupported = hasUnsupported || unsupported;
            return block;
          },
        );
        const width = decompileColumnWidth(col?.element);
        return width ? { width, blocks: colBlocks } : { blocks: colBlocks };
      });
      blocks.push({
        object: ApiObjectType.BLOCK,
        ...(typeof root?.id === 'string' ? { id: root.id } : {}),
        type: 'columns',
        columns: cols,
      });
    }
  }
  return { blocks, hasUnsupported };
}

function decompileColumnWidth(
  columnElement: unknown,
): { unit: 'percent' | 'pixels' | 'fill'; value?: number } | undefined {
  const w = (columnElement as any)?.width;
  if (!w || (w.type !== 'percent' && w.type !== 'pixels' && w.type !== 'fill')) {
    return undefined;
  }
  return { unit: w.type, ...(typeof w.value === 'number' ? { value: w.value } : {}) };
}

function decompileElement(wrapper: unknown): { block: AuthoringBlock; unsupported: boolean } {
  const id = (wrapper as any)?.id as string | undefined;
  const e = (wrapper as any)?.element ?? {};
  const base = { object: ApiObjectType.BLOCK as const, ...(typeof id === 'string' ? { id } : {}) };

  switch (e.type) {
    case 'text':
      return {
        block: { ...base, type: 'text', markdown: richTextToMarkdown(e.data) },
        unsupported: false,
      };
    case 'image': {
      const link =
        e.link && typeof e.link.url === 'string' && e.link.url
          ? { url: e.link.url, ...(e.link.openType === 'new' ? { newTab: true } : {}) }
          : undefined;
      return {
        block: {
          ...base,
          type: 'image',
          url: typeof e.url === 'string' ? e.url : '',
          ...(typeof e.alt === 'string' ? { alt: e.alt } : {}),
          ...(link ? { link } : {}),
        },
        unsupported: false,
      };
    }
    case 'button': {
      const variant =
        e.data?.type === 'primary' || e.data?.type === 'secondary' ? e.data.type : undefined;
      return {
        block: {
          ...base,
          type: 'button',
          text: typeof e.data?.text === 'string' ? e.data.text : '',
          ...(variant ? { variant } : {}),
        },
        unsupported: false,
      };
    }
    case 'embed':
      return {
        block: { ...base, type: 'embed', url: typeof e.url === 'string' ? e.url : '' },
        unsupported: false,
      };
    case 'nps':
    case 'star-rating':
    case 'scale':
    case 'single-line-text':
    case 'multi-line-text':
    case 'multiple-choice': {
      const question = decompileQuestion(e);
      if (!question) {
        return { block: { ...base, type: 'unsupported' }, unsupported: true };
      }
      return { block: { ...base, type: 'question', question }, unsupported: false };
    }
    default:
      return {
        block: { ...base, type: 'unsupported', ...(e.type ? { note: String(e.type) } : {}) },
        unsupported: true,
      };
  }
}

function decompileQuestion(e: any): AuthoringQuestion | undefined {
  const d = e.data ?? {};
  const bind =
    d.bindToAttribute && d.selectedAttribute ? { bindAttribute: d.selectedAttribute } : {};
  const common = {
    name: typeof d.name === 'string' ? d.name : '',
    ...(d.cvid ? { cvid: d.cvid } : {}),
    ...bind,
  };
  const label = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
  const lo = label(d.lowLabel);
  const hi = label(d.highLabel);

  switch (e.type) {
    case 'nps':
      return {
        kind: 'nps',
        ...common,
        ...(lo ? { lowLabel: lo } : {}),
        ...(hi ? { highLabel: hi } : {}),
      };
    case 'star-rating':
      return {
        kind: 'rating',
        ...common,
        style: 'star',
        range: {
          low: typeof d.lowRange === 'number' ? d.lowRange : 1,
          high: typeof d.highRange === 'number' ? d.highRange : 5,
        },
        ...(typeof d.rating === 'number' ? { default: d.rating } : {}),
        ...(lo ? { lowLabel: lo } : {}),
        ...(hi ? { highLabel: hi } : {}),
      };
    case 'scale':
      return {
        kind: 'rating',
        ...common,
        style: 'scale',
        range: {
          low: typeof d.lowRange === 'number' ? d.lowRange : 0,
          high: typeof d.highRange === 'number' ? d.highRange : 10,
        },
        ...(lo ? { lowLabel: lo } : {}),
        ...(hi ? { highLabel: hi } : {}),
      };
    case 'single-line-text':
    case 'multi-line-text':
      return {
        kind: 'text',
        ...common,
        multiline: e.type === 'multi-line-text',
        ...(typeof d.placeholder === 'string' && d.placeholder
          ? { placeholder: d.placeholder }
          : {}),
        ...(typeof d.buttonText === 'string' && d.buttonText ? { buttonText: d.buttonText } : {}),
        ...(typeof d.required === 'boolean' ? { required: d.required } : {}),
      };
    case 'multiple-choice':
      return {
        kind: 'choice',
        ...common,
        options: (Array.isArray(d.options) ? d.options : []).map((o: any) => ({
          label: typeof o?.label === 'string' ? o.label : '',
          value: typeof o?.value === 'string' ? o.value : '',
        })),
        allowMultiple: !!d.allowMultiple,
        ...(typeof d.enableOther === 'boolean' ? { enableOther: d.enableOther } : {}),
        ...(typeof d.otherPlaceholder === 'string' && d.otherPlaceholder
          ? { otherPlaceholder: d.otherPlaceholder }
          : {}),
        ...(typeof d.shuffleOptions === 'boolean' ? { shuffle: d.shuffleOptions } : {}),
        ...(typeof d.buttonText === 'string' && d.buttonText ? { buttonText: d.buttonText } : {}),
      };
    default:
      return undefined;
  }
}

// ── Target ───────────────────────────────────────────────────────────────────

function decompileTarget(raw: unknown): AuthoringTarget | undefined {
  const t = raw as any;
  if (!t || typeof t !== 'object') {
    return undefined;
  }
  if (t.type && t.type !== 'auto' && typeof t.customSelector === 'string' && t.customSelector) {
    const nth = parseNth(t.sequence);
    return { by: 'selector', selector: t.customSelector, ...(nth !== undefined ? { nth } : {}) };
  }
  if (typeof t.content === 'string' && t.content) {
    return { by: 'text', text: t.content };
  }
  return undefined;
}

function hasAutoTarget(raw: unknown): boolean {
  const t = raw as any;
  return !!(t && typeof t === 'object' && (t.selectors || t.selectorsList || t.type === 'auto'));
}

function parseNth(sequence: unknown): number | undefined {
  if (typeof sequence !== 'string') {
    return undefined;
  }
  const n = Number.parseInt(sequence, 10);
  return Number.isFinite(n) && n >= 1 ? n - 1 : undefined;
}

// ── Placement ────────────────────────────────────────────────────────────────

function decompilePlacement(raw: unknown, type: string): AuthoringPlacement | undefined {
  const s = raw as any;
  if (!s || typeof s !== 'object') {
    return undefined;
  }
  if (type === 'modal' || type === 'bubble') {
    if (typeof s.position !== 'string' || !POSITIONS.has(s.position)) {
      return undefined;
    }
    return {
      position: s.position,
      ...(typeof s.positionOffsetX === 'number' ? { offsetX: s.positionOffsetX } : {}),
      ...(typeof s.positionOffsetY === 'number' ? { offsetY: s.positionOffsetY } : {}),
      ...(typeof s.enabledBackdrop === 'boolean' ? { backdrop: s.enabledBackdrop } : {}),
      ...(typeof s.enabledBlockTarget === 'boolean' ? { blockTarget: s.enabledBlockTarget } : {}),
    };
  }
  if (type === 'tooltip') {
    if (
      typeof s.side !== 'string' ||
      !SIDES.has(s.side) ||
      typeof s.align !== 'string' ||
      !ALIGNS.has(s.align)
    ) {
      return undefined;
    }
    return {
      side: s.side,
      align: s.align,
      ...(typeof s.sideOffset === 'number' ? { sideOffset: s.sideOffset } : {}),
      ...(typeof s.alignOffset === 'number' ? { alignOffset: s.alignOffset } : {}),
    };
  }
  return undefined;
}
