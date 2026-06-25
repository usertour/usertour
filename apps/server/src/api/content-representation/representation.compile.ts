import { cuid, defaultColumn, defaultStep } from '@usertour/helpers';

import {
  RepresentationAction,
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
import { decompileText } from './text.decompile';

/**
 * Compile a representation step back into the internal step shape the domain
 * `updateContentVersion` accepts — the inverse of the decompiler. Writes are a
 * FIELD-LEVEL MERGE onto the existing internal step (matched by step cvid /
 * block id): representation-expressible fields are overwritten, while styling, the
 * "auto" target fingerprint, and setting offsets are preserved from `existing`.
 */
export interface CompiledStep {
  cvid: string;
  themeId: string | null;
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
  themeId?: string | null;
  data?: unknown;
  target?: unknown;
  setting?: unknown;
};

/** The fields the compiler reads — satisfied by both the read step and write input. */
type StepToCompile = {
  cvid?: string | null;
  themeId?: string | null;
  name: string;
  type: string;
  sequence: number;
  target?: RepresentationTarget;
  placement?: RepresentationPlacement;
  width?: number;
  skippable?: boolean;
  explicitCompletionStep?: boolean;
  content: RepresentationBlock[];
  triggers?: RepresentationTrigger[];
  onClick?: RepresentationAction[];
};

export function compileStep(
  step: StepToCompile,
  existing: InternalStep | undefined,
  r: CompileResolvers,
): CompiledStep {
  const target: Record<string, unknown> = step.target
    ? (compileTargetToElementData(step.target, existing?.target) as Record<string, unknown>)
    : ((existing?.target as Record<string, unknown>) ?? {});
  // "Click the target element to advance" actions live on target.actions (the SDK
  // reads currentStep.target.actions). An explicit onClick sets them; when omitted
  // the target field-merge above already preserved any existing ones.
  if (step.onClick !== undefined) {
    target.actions = compileActions(step.onClick, r);
  }
  return {
    // cvid is server-owned: preserve the matched existing step's cvid on update,
    // generate a fresh one on create. Never taken from client input.
    cvid: step.cvid ?? existing?.cvid ?? cuid(),
    // Per-step theme override: omit (undefined) preserves the existing value,
    // explicit null clears it (inherit the version theme), a string sets it.
    themeId: step.themeId !== undefined ? step.themeId : (existing?.themeId ?? null),
    name: step.name,
    type: step.type,
    sequence: step.sequence,
    data: compileContent(step.content, existing?.data, r),
    target,
    trigger: compileTriggers(step.triggers, r),
    setting: compileSetting(step, existing?.setting),
  };
}

// ── Setting (merge placement / width / skippable into existing) ───────────────

// The builder seeds every new step with a full default setting (position:'center',
// side/align, alignType:'auto', skippable, offsets, …) and the SDK relies on them
// — e.g. a modal with no `position` is anchored off-screen (tour.tsx reads
// `setting.position ?? ''`), and a missing `skippable`/`alignType` drops the close
// button / collision-avoidance. Mirror how non-flow `data` is seeded at create:
// seed these defaults (SSOT: `@usertour/helpers`) ONLY on create (no existing), so
// an API step renders like a builder one while update keeps a faithful round-trip.
const DEFAULT_STEP_SETTING = defaultStep.setting as Record<string, unknown>;

function compileSetting(step: StepToCompile, existingSetting: unknown): unknown {
  const s: Record<string, unknown> = {
    ...(existingSetting != null
      ? (existingSetting as Record<string, unknown>)
      : DEFAULT_STEP_SETTING),
  };
  const p = step.placement;
  if (p && 'side' in p) {
    s.side = p.side;
    s.align = p.align;
    if (p.sideOffset !== undefined) s.sideOffset = p.sideOffset;
    if (p.alignOffset !== undefined) s.alignOffset = p.alignOffset;
    if (p.alignType !== undefined) s.alignType = p.alignType;
    if (p.backdrop !== undefined) s.enabledBackdrop = p.backdrop;
    if (p.blockTarget !== undefined) s.enabledBlockTarget = p.blockTarget;
  } else if (p && 'position' in p) {
    s.position = p.position;
    if (p.offsetX !== undefined) s.positionOffsetX = p.offsetX;
    if (p.offsetY !== undefined) s.positionOffsetY = p.offsetY;
    if (p.backdrop !== undefined) s.enabledBackdrop = p.backdrop;
    if (p.blockTarget !== undefined) s.enabledBlockTarget = p.blockTarget;
  }
  if (step.width !== undefined) s.width = step.width;
  if (step.skippable !== undefined) s.skippable = step.skippable;
  if (step.explicitCompletionStep !== undefined) {
    s.explicitCompletionStep = step.explicitCompletionStep;
  }
  // Guarantee a modal renders on-screen even when updating a legacy step whose
  // existing setting lacks a position (create already gets it from the defaults).
  if (step.type === 'modal' && s.position === undefined) {
    s.position = (DEFAULT_STEP_SETTING.position as string) ?? 'center';
  }
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

// Representation styling → internal element shapes. width: `unit` → `type`;
// spacing carries an `enabled` flag (default true when the author set any side);
// column justify/align are stored as the tailwind classes the renderer applies.
const toInternalWidth = (w: { unit: string; value?: number }) => ({
  type: w.unit,
  ...(w.value !== undefined ? { value: w.value } : {}),
});
const toInternalSpacing = (s: {
  enabled?: boolean;
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}) => ({
  enabled: s.enabled ?? true,
  ...(s.top !== undefined ? { top: s.top } : {}),
  ...(s.bottom !== undefined ? { bottom: s.bottom } : {}),
  ...(s.left !== undefined ? { left: s.left } : {}),
  ...(s.right !== undefined ? { right: s.right } : {}),
});

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
            // Seed the shared column defaults (fill + centered) so API columns render
            // like builder ones; explicit per-column width/justify/align/padding override.
            ...defaultColumn,
            ...(col.width ? { width: toInternalWidth(col.width) } : {}),
            ...(col.justify ? { justifyContent: `justify-${col.justify}` } : {}),
            ...(col.align ? { alignItems: `items-${col.align}` } : {}),
            ...(col.padding ? { padding: toInternalSpacing(col.padding) } : {}),
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
          // Implicit single column wrapping a block — seed the shared column defaults
          // (defaultColumn: fill + centered) so an API step renders like a builder one,
          // mirroring how steps seed DEFAULT_STEP_SETTING.
          element: { ...defaultColumn },
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
    case 'text': {
      // Field-merge: markdown can't carry align / color / underline, but those
      // live on the existing Slate. If the author didn't actually change the text
      // (its markdown still decompiles to the same string), keep the original
      // Slate so those marks survive a write-back; only regenerate when the
      // markdown was rewritten. (Mirrors the keepStyle merge image/button get.)
      const prevText = existing?.element;
      const unchanged =
        prevText?.type === 'text' &&
        Array.isArray(prevText.data) &&
        decompileText(prevText.data) === block.markdown;
      return {
        id,
        element: {
          type: 'text',
          data: unchanged ? prevText.data : compileText(block.markdown),
        },
        children: null,
      };
    }
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
          ...(block.width ? { width: toInternalWidth(block.width) } : {}),
          ...(block.margin ? { margin: toInternalSpacing(block.margin) } : {}),
        },
        children: null,
      };
    case 'button':
      return {
        id,
        element: {
          ...keepStyle,
          type: 'button',
          ...(block.margin ? { margin: toInternalSpacing(block.margin) } : {}),
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
      return {
        id,
        element: {
          ...keepStyle,
          type: 'embed',
          url: block.url,
          ...(block.width ? { width: toInternalWidth(block.width) } : {}),
          ...(block.height ? { height: toInternalWidth(block.height) } : {}),
          ...(block.margin ? { margin: toInternalSpacing(block.margin) } : {}),
        },
        children: null,
      };
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
