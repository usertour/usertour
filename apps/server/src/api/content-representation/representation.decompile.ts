import { ApiObjectType } from '../shared/object-type';
import {
  RepresentationBlock,
  RepresentationPlacement,
  RepresentationQuestion,
  RepresentationStep,
} from './representation.schema';
import { decompileText } from './text.decompile';
import {
  DecompileResolvers,
  IDENTITY_RESOLVERS,
  decompileActions,
  decompileTriggers,
  decompileWhen,
} from './rules.decompile';
import { decompileTarget, hasAutoTarget } from './target.decompile';

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
 * Decompile an internal step into the representation step: identity + target +
 * placement + content blocks + triggers. `resolvers` map internal attribute /
 * event ids to stable codes (identity by default, e.g. for unit tests).
 */
export function decompileStep(
  step: StepNode,
  resolvers: DecompileResolvers = IDENTITY_RESOLVERS,
): RepresentationStep {
  const { blocks, hasUnsupported: contentUnsupported } = decompileContent(step.data, resolvers);
  const target = decompileTarget(step.target);
  const placement = decompilePlacement(step.setting, step.type ?? '');
  const setting = (step.setting ?? {}) as Record<string, unknown>;
  const triggers = decompileTriggers(step.trigger, resolvers);
  // "Click the target element to advance" actions live on the target elementData.
  const onClick = decompileActions((step.target as { actions?: unknown } | undefined)?.actions);

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
    ...(triggers.length ? { triggers } : {}),
    ...(onClick.length ? { onClick } : {}),
    ...(hasUnsupported ? { advanced: { hasUnsupported: true } } : {}),
  };
}

// ── Content blocks ───────────────────────────────────────────────────────────

/** ContentEditorRoot[] → flat block list (multi-column rows → a `columns` block). */
export function decompileContent(
  data: unknown,
  resolvers: DecompileResolvers = IDENTITY_RESOLVERS,
): { blocks: RepresentationBlock[]; hasUnsupported: boolean } {
  const roots = Array.isArray(data) ? data : [];
  const blocks: RepresentationBlock[] = [];
  let hasUnsupported = false;

  for (const root of roots) {
    const columns: unknown[] = Array.isArray(root?.children) ? root.children : [];
    // Flatten a single column to bare blocks ONLY when it has no non-default
    // layout styling — otherwise its justify/align/padding would be lost, so
    // keep it as a one-column `columns` block that carries them.
    if (columns.length <= 1 && !columnHasLayout((columns[0] as any)?.element)) {
      const elements: unknown[] = Array.isArray((columns[0] as any)?.children)
        ? (columns[0] as any).children
        : [];
      for (const el of elements) {
        const { block, unsupported } = decompileElement(el, resolvers);
        hasUnsupported = hasUnsupported || unsupported;
        blocks.push(block);
      }
    } else {
      const cols = columns.map((col: any) => {
        const colBlocks: RepresentationBlock[] = (
          Array.isArray(col?.children) ? col.children : []
        ).map((el: unknown) => {
          const { block, unsupported } = decompileElement(el, resolvers);
          hasUnsupported = hasUnsupported || unsupported;
          return block;
        });
        const el = col?.element;
        const width = decompileWidth(el?.width);
        const justify = decompileJustify(el);
        const align = decompileAlign(el);
        const padding = decompileSpacing(el?.padding);
        return {
          ...(width ? { width } : {}),
          ...(justify ? { justify } : {}),
          ...(align ? { align } : {}),
          ...(padding ? { padding } : {}),
          blocks: colBlocks,
        };
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

// ── Element styling → representation (inverse of the compile helpers) ──────────
function decompileWidth(
  w: unknown,
): { unit: 'percent' | 'pixels' | 'fill'; value?: number } | undefined {
  const x = w as { type?: string; value?: unknown } | undefined;
  if (!x || (x.type !== 'percent' && x.type !== 'pixels' && x.type !== 'fill')) return undefined;
  return { unit: x.type, ...(typeof x.value === 'number' ? { value: x.value } : {}) };
}
/** Spacing (margin/padding) — only emitted when it carries an actual side value. */
function decompileSpacing(
  s: unknown,
): { enabled?: boolean; top?: number; bottom?: number; left?: number; right?: number } | undefined {
  const x = s as Record<string, unknown> | undefined;
  if (!x || typeof x !== 'object') return undefined;
  const sides: Record<string, number> = {};
  for (const k of ['top', 'bottom', 'left', 'right']) {
    if (typeof x[k] === 'number') sides[k] = x[k] as number;
  }
  if (Object.keys(sides).length === 0) return undefined;
  return { ...(typeof x.enabled === 'boolean' ? { enabled: x.enabled } : {}), ...sides };
}
const decompileJustify = (el: any) => {
  const j = el?.justifyContent;
  return typeof j === 'string' && j.startsWith('justify-') && j !== 'justify-start'
    ? (j.slice('justify-'.length) as 'center' | 'end' | 'between' | 'around' | 'evenly')
    : undefined;
};
const decompileAlign = (el: any) => {
  const a = el?.alignItems;
  return typeof a === 'string' && a.startsWith('items-') && a !== 'items-start'
    ? (a.slice('items-'.length) as 'center' | 'end' | 'baseline')
    : undefined;
};
/** A column "has layout" (so it can't be flattened) if it sets non-default
 * justify / align / padding. Width is ignored: a lone column always fills. */
const columnHasLayout = (el: any): boolean =>
  !!(decompileJustify(el) || decompileAlign(el) || decompileSpacing(el?.padding));

function decompileElement(
  wrapper: unknown,
  resolvers: DecompileResolvers,
): { block: RepresentationBlock; unsupported: boolean } {
  const id = (wrapper as any)?.id as string | undefined;
  const e = (wrapper as any)?.element ?? {};
  const base = { object: ApiObjectType.BLOCK as const, ...(typeof id === 'string' ? { id } : {}) };

  switch (e.type) {
    case 'text':
      return {
        block: { ...base, type: 'text', markdown: decompileText(e.data) },
        unsupported: false,
      };
    case 'image': {
      const link =
        e.link && typeof e.link.url === 'string' && e.link.url
          ? { url: e.link.url, ...(e.link.openType === 'new' ? { newTab: true } : {}) }
          : undefined;
      const width = decompileWidth(e.width);
      const margin = decompileSpacing(e.margin);
      return {
        block: {
          ...base,
          type: 'image',
          url: typeof e.url === 'string' ? e.url : '',
          ...(typeof e.alt === 'string' ? { alt: e.alt } : {}),
          ...(link ? { link } : {}),
          ...(width ? { width } : {}),
          ...(margin ? { margin } : {}),
        },
        unsupported: false,
      };
    }
    case 'button': {
      const variant =
        e.data?.type === 'primary' || e.data?.type === 'secondary' ? e.data.type : undefined;
      const actions = decompileActions(e.data?.actions);
      const disableConds = Array.isArray(e.data?.disableButtonConditions)
        ? e.data.disableButtonConditions
        : [];
      const hideConds = Array.isArray(e.data?.hideButtonConditions)
        ? e.data.hideButtonConditions
        : [];
      const margin = decompileSpacing(e.margin);
      return {
        block: {
          ...base,
          type: 'button',
          text: typeof e.data?.text === 'string' ? e.data.text : '',
          ...(variant ? { variant } : {}),
          ...(actions.length ? { actions } : {}),
          ...(disableConds.length ? { disabledWhen: decompileWhen(disableConds, resolvers) } : {}),
          ...(hideConds.length ? { hiddenWhen: decompileWhen(hideConds, resolvers) } : {}),
          ...(margin ? { margin } : {}),
        },
        unsupported: false,
      };
    }
    case 'embed': {
      const width = decompileWidth(e.width);
      const height = decompileWidth(e.height);
      const margin = decompileSpacing(e.margin);
      return {
        block: {
          ...base,
          type: 'embed',
          url: typeof e.url === 'string' ? e.url : '',
          ...(width ? { width } : {}),
          ...(height ? { height } : {}),
          ...(margin ? { margin } : {}),
        },
        unsupported: false,
      };
    }
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
      const actions = decompileActions(e.data?.actions);
      return {
        block: { ...base, type: 'question', question, ...(actions.length ? { actions } : {}) },
        unsupported: false,
      };
    }
    default:
      return {
        block: { ...base, type: 'unsupported', ...(e.type ? { note: String(e.type) } : {}) },
        unsupported: true,
      };
  }
}

function decompileQuestion(e: any): RepresentationQuestion | undefined {
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

// ── Placement ────────────────────────────────────────────────────────────────

function decompilePlacement(raw: unknown, type: string): RepresentationPlacement | undefined {
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
