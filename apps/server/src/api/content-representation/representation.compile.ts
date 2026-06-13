import { cuid } from '@usertour/helpers';

import {
  RepresentationBlock,
  RepresentationPlacement,
  RepresentationQuestion,
  RepresentationTarget,
  RepresentationTrigger,
} from './representation.schema';
import { compileText } from './text.compile';
import {
  CompileResolvers,
  DismissVariant,
  compileActions,
  compileConditions,
  compileTriggers,
} from './rules.compile';
import { compileTargetToElementData } from './target.compile';

/**
 * Compile a representation step back into the internal step shape the domain
 * `updateContentVersion` accepts — the inverse of the decompiler. Writes are a
 * FIELD-LEVEL MERGE onto the existing internal step (matched by step cvid /
 * block id): representation-expressible fields are overwritten, while styling, the
 * "auto" target fingerprint, and setting offsets are preserved from `existing`.
 */
export interface CompiledStep {
  cvid: string;
  name: string;
  type: string;
  sequence: number;
  data: unknown;
  target: unknown;
  trigger: unknown;
  setting: unknown;
}

type InternalStep = {
  cvid?: string;
  data?: unknown;
  target?: unknown;
  setting?: unknown;
};

/** The fields the compiler reads — satisfied by both the read step and write input. */
type StepToCompile = {
  cvid?: string | null;
  name: string;
  type: string;
  sequence: number;
  target?: RepresentationTarget;
  placement?: RepresentationPlacement;
  width?: number;
  skippable?: boolean;
  content: RepresentationBlock[];
  triggers?: RepresentationTrigger[];
};

export function compileStep(
  step: StepToCompile,
  existing: InternalStep | undefined,
  r: CompileResolvers,
): CompiledStep {
  return {
    // cvid is server-owned: preserve the matched existing step's cvid on update,
    // generate a fresh one on create. Never taken from client input.
    cvid: step.cvid ?? existing?.cvid ?? cuid(),
    name: step.name,
    type: step.type,
    sequence: step.sequence,
    data: compileContent(step.content, existing?.data, r),
    target: step.target ? compileTargetToElementData(step.target) : (existing?.target ?? {}),
    trigger: compileTriggers(step.triggers, r),
    setting: compileSetting(step, existing?.setting),
  };
}

// ── Setting (merge placement / width / skippable into existing) ───────────────

function compileSetting(step: StepToCompile, existingSetting: unknown): unknown {
  const s: Record<string, unknown> = { ...((existingSetting as Record<string, unknown>) ?? {}) };
  const p = step.placement;
  if (p && 'side' in p) {
    s.side = p.side;
    s.align = p.align;
    if (p.sideOffset !== undefined) s.sideOffset = p.sideOffset;
    if (p.alignOffset !== undefined) s.alignOffset = p.alignOffset;
  } else if (p && 'position' in p) {
    s.position = p.position;
    if (p.offsetX !== undefined) s.positionOffsetX = p.offsetX;
    if (p.offsetY !== undefined) s.positionOffsetY = p.offsetY;
    if (p.backdrop !== undefined) s.enabledBackdrop = p.backdrop;
    if (p.blockTarget !== undefined) s.enabledBlockTarget = p.blockTarget;
  }
  if (step.width !== undefined) s.width = step.width;
  if (step.skippable !== undefined) s.skippable = step.skippable;
  return s;
}

// ── Content (blocks → ContentEditorRoot[], merged by block id) ────────────────

function indexElements(data: unknown): Map<string, any> {
  const map = new Map<string, any>();
  for (const root of Array.isArray(data) ? data : []) {
    for (const col of (root?.children as any[]) ?? []) {
      for (const el of (col?.children as any[]) ?? []) {
        if (el?.id) {
          map.set(el.id, el);
        }
      }
    }
  }
  return map;
}

export function compileContent(
  blocks: RepresentationBlock[],
  existingData: unknown,
  r: CompileResolvers,
  dismiss: DismissVariant = 'flow-dismis',
): unknown {
  const byId = indexElements(existingData);
  return (blocks ?? []).map((block) => {
    if (block.type === 'columns') {
      return {
        id: block.id ?? cuid(),
        element: { type: 'group' },
        children: block.columns.map((col) => ({
          id: cuid(),
          element: {
            type: 'column',
            ...(col.width ? { width: { type: col.width.unit, value: col.width.value } } : {}),
          },
          children: col.blocks.map((b) => compileElement(b, byId, r, dismiss)),
        })),
      };
    }
    return {
      id: cuid(),
      element: { type: 'group' },
      children: [
        {
          id: cuid(),
          element: { type: 'column' },
          children: [compileElement(block, byId, r, dismiss)],
        },
      ],
    };
  });
}

function compileElement(
  block: RepresentationBlock,
  byId: Map<string, any>,
  r: CompileResolvers,
  dismiss: DismissVariant = 'flow-dismis',
): any {
  const existing = block.id ? byId.get(block.id) : undefined;
  const id = block.id ?? cuid();
  const keepStyle = existing?.element ?? {};

  switch (block.type) {
    case 'text':
      return {
        id,
        element: { type: 'text', data: compileText(block.markdown) },
        children: null,
      };
    case 'image':
      return {
        id,
        element: {
          ...keepStyle,
          type: 'image',
          url: block.url,
          ...(block.alt ? { alt: block.alt } : {}),
          ...(block.link
            ? { link: { url: block.link.url, openType: block.link.newTab ? 'new' : 'same' } }
            : {}),
        },
        children: null,
      };
    case 'button':
      return {
        id,
        element: {
          ...keepStyle,
          type: 'button',
          data: {
            ...((keepStyle as any).data ?? {}),
            text: block.text,
            ...(block.variant ? { type: block.variant } : {}),
            actions: compileActions(block.actions, r, dismiss),
            ...(block.disabledWhen
              ? {
                  disableButton: true,
                  disableButtonConditions: compileConditions(block.disabledWhen, r),
                }
              : {}),
            ...(block.hiddenWhen
              ? { hideButton: true, hideButtonConditions: compileConditions(block.hiddenWhen, r) }
              : {}),
          },
        },
        children: null,
      };
    case 'embed':
      return { id, element: { ...keepStyle, type: 'embed', url: block.url }, children: null };
    case 'question': {
      // The question's cvid is server-owned: preserve the matched element's cvid
      // on update, generate on create — the client-supplied value is ignored.
      const existingCvid = (existing?.element as any)?.data?.cvid;
      const q = compileQuestion(block.question, existingCvid);
      return {
        id,
        element: {
          type: q.type,
          data: {
            ...((keepStyle as any).data ?? {}),
            ...q.data,
            ...(block.actions ? { actions: compileActions(block.actions, r, dismiss) } : {}),
          },
        },
        children: null,
      };
    }
    default:
      // unsupported → keep the original element verbatim when we have it.
      return (
        existing ?? {
          id,
          element: { type: 'text', data: [{ type: 'paragraph', children: [{ text: '' }] }] },
          children: null,
        }
      );
  }
}

function compileQuestion(
  q: RepresentationQuestion,
  existingCvid?: string,
): { type: string; data: any } {
  const bind = q.bindAttribute ? { bindToAttribute: true, selectedAttribute: q.bindAttribute } : {};
  const base = { cvid: existingCvid ?? cuid(), name: q.name, ...bind };
  switch (q.kind) {
    case 'nps':
      return {
        type: 'nps',
        data: {
          ...base,
          ...(q.lowLabel ? { lowLabel: q.lowLabel } : {}),
          ...(q.highLabel ? { highLabel: q.highLabel } : {}),
        },
      };
    case 'rating':
      return {
        type: q.style === 'star' ? 'star-rating' : 'scale',
        data: {
          ...base,
          lowRange: q.range.low,
          highRange: q.range.high,
          ...(q.default !== undefined ? { rating: q.default } : {}),
          ...(q.lowLabel ? { lowLabel: q.lowLabel } : {}),
          ...(q.highLabel ? { highLabel: q.highLabel } : {}),
        },
      };
    case 'text':
      return {
        type: q.multiline ? 'multi-line-text' : 'single-line-text',
        data: {
          ...base,
          ...(q.placeholder ? { placeholder: q.placeholder } : {}),
          ...(q.buttonText ? { buttonText: q.buttonText } : {}),
          ...(q.required !== undefined ? { required: q.required } : {}),
        },
      };
    case 'choice':
      return {
        type: 'multiple-choice',
        data: {
          ...base,
          options: q.options.map((o) => ({ label: o.label, value: o.value, checked: false })),
          allowMultiple: q.allowMultiple,
          ...(q.enableOther !== undefined ? { enableOther: q.enableOther } : {}),
          ...(q.otherPlaceholder ? { otherPlaceholder: q.otherPlaceholder } : {}),
          ...(q.shuffle !== undefined ? { shuffleOptions: q.shuffle } : {}),
          ...(q.buttonText ? { buttonText: q.buttonText } : {}),
        },
      };
  }
}
