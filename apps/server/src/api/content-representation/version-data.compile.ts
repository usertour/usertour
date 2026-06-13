import { cuid } from '@usertour/helpers';

import { z } from 'zod';

import { ValidationError } from '@/common/errors/errors';

import { compileContent } from './representation.compile';
import { compileResourceCenter } from './resource-center.compile';
import { representationResourceCenter } from './resource-center.schema';
import { compileActions, compileConditions, CompileResolvers } from './rules.compile';
import { compileTargetToElementData } from './target.compile';
import {
  representationBanner,
  RepresentationBanner,
  representationChecklist,
  RepresentationChecklist,
  representationLauncher,
  RepresentationLauncher,
  representationTracker,
  RepresentationTracker,
} from './version-data.schema';

/**
 * Compile a representation `data` body back into the internal `version.data`,
 * dispatching on the content type. Validates the payload against the type's
 * schema (→ E1017 on mismatch) and field-level merges onto `existingData` so
 * styling / screenshots / computed sizes / runtime state are preserved.
 *
 * Throws E1017 when the content type does not accept a `data` body (e.g. `flow`,
 * whose body is `steps`).
 */
export function compileVersionData(
  contentType: string,
  data: unknown,
  existingData: unknown,
  resolvers: CompileResolvers,
): unknown {
  switch (contentType) {
    case 'tracker':
      return compileTracker(parse(representationTracker, data), existingData, resolvers);
    case 'checklist':
      return compileChecklist(parse(representationChecklist, data), existingData, resolvers);
    case 'launcher':
      return compileLauncher(parse(representationLauncher, data), existingData, resolvers);
    case 'banner':
      return compileBanner(parse(representationBanner, data), existingData, resolvers);
    case 'resource-center':
      return compileResourceCenter(
        parse(representationResourceCenter, data),
        existingData,
        resolvers,
      );
    default:
      throw new ValidationError(`Content type "${contentType}" does not accept a data body`);
  }
}

/** Validate the representation payload against a type schema, mapping failures to E1017. */
function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(result.error.issues[0]?.message ?? 'Invalid data body');
  }
  return result.data;
}

function compileTracker(
  rep: RepresentationTracker,
  existing: unknown,
  r: CompileResolvers,
): unknown {
  const base = (existing ?? {}) as Record<string, unknown>;
  return { ...base, eventId: rep.event ? r.eventId(rep.event) : null };
}

function compileChecklist(
  rep: RepresentationChecklist,
  existing: unknown,
  r: CompileResolvers,
): unknown {
  const base = (existing ?? {}) as Record<string, any>;
  const out: Record<string, any> = { ...base };
  if (rep.buttonText !== undefined) out.buttonText = rep.buttonText;
  if (rep.initialDisplay !== undefined) out.initialDisplay = rep.initialDisplay;
  if (rep.completionOrder !== undefined) out.completionOrder = rep.completionOrder;
  if (rep.preventDismiss !== undefined) out.preventDismissChecklist = rep.preventDismiss;
  if (rep.autoDismiss !== undefined) out.autoDismissChecklist = rep.autoDismiss;
  if (rep.content !== undefined)
    out.content = compileContent(rep.content, base.content, r, 'checklist-dismis');

  if (rep.items !== undefined) {
    const prevById = new Map(
      (Array.isArray(base.items) ? base.items : []).map((it: any) => [it.id, it]),
    );
    out.items = rep.items.map((it) => {
      const prev = it.id ? prevById.get(it.id) : undefined;
      const onlyShowTask = it.onlyShowWhen !== undefined;
      return {
        ...(prev ?? {}),
        id: it.id ?? cuid(),
        name: it.name,
        ...(it.description !== undefined ? { description: it.description } : {}),
        isCompleted: prev?.isCompleted ?? false,
        completeConditions: compileConditions(it.completeWhen ?? [], r),
        clickedActions: compileActions(it.clickActions ?? [], r, 'checklist-dismis'),
        onlyShowTask,
        onlyShowTaskConditions: onlyShowTask ? compileConditions(it.onlyShowWhen ?? [], r) : [],
      };
    });
  }
  return out;
}

function compileLauncher(
  rep: RepresentationLauncher,
  existing: unknown,
  r: CompileResolvers,
): unknown {
  const base = (existing ?? {}) as Record<string, any>;
  const out: Record<string, any> = { ...base };
  if (rep.style !== undefined) out.type = rep.style;
  if (rep.icon !== undefined) {
    if (rep.icon.source !== undefined) out.iconSource = rep.icon.source;
    if (rep.icon.url !== undefined) out.iconUrl = rep.icon.url;
    if (rep.icon.type !== undefined) out.iconType = rep.icon.type;
  }
  if (rep.buttonText !== undefined) out.buttonText = rep.buttonText;
  if (rep.zIndex !== undefined) out.zIndex = rep.zIndex;
  if (rep.target !== undefined) {
    out.target = {
      ...(base.target ?? {}),
      element: compileTargetToElementData(rep.target, base.target?.element),
    };
  }
  if (rep.tooltip !== undefined) {
    const t: Record<string, any> = { ...(base.tooltip ?? {}) };
    const p = rep.tooltip.placement;
    if (p !== undefined) {
      t.alignment = {
        ...(base.tooltip?.alignment ?? {}),
        side: p.side,
        align: p.align,
        ...(p.sideOffset !== undefined ? { sideOffset: p.sideOffset } : {}),
        ...(p.alignOffset !== undefined ? { alignOffset: p.alignOffset } : {}),
      };
    }
    if (rep.tooltip.width !== undefined) t.width = rep.tooltip.width;
    if (rep.tooltip.reference !== undefined) t.reference = rep.tooltip.reference;
    if (rep.tooltip.content !== undefined) {
      t.content = compileContent(rep.tooltip.content, base.tooltip?.content, r, 'launcher-dismis');
    }
    const s = rep.tooltip.settings;
    if (s !== undefined) {
      const settings: Record<string, any> = { ...(base.tooltip?.settings ?? {}) };
      if (s.dismissAfterFirstActivation !== undefined) {
        settings.dismissAfterFirstActivation = s.dismissAfterFirstActivation;
      }
      if (s.keepOpenWhenHovered !== undefined) {
        settings.keepTooltipOpenWhenHovered = s.keepOpenWhenHovered;
      }
      if (s.hideLauncherWhenTooltipShown !== undefined) {
        settings.hideLauncherWhenTooltipIsDisplayed = s.hideLauncherWhenTooltipShown;
      }
      t.settings = settings;
    }
    out.tooltip = t;
  }
  if (rep.behavior !== undefined) {
    const b: Record<string, any> = { ...(base.behavior ?? {}) };
    if (rep.behavior.triggerElement !== undefined) b.triggerElement = rep.behavior.triggerElement;
    if (rep.behavior.event !== undefined) b.triggerEvent = rep.behavior.event;
    if (rep.behavior.action !== undefined) b.actionType = rep.behavior.action;
    if (rep.behavior.actions !== undefined)
      b.actions = compileActions(rep.behavior.actions, r, 'launcher-dismis');
    out.behavior = b;
  }
  return out;
}

function compileBanner(rep: RepresentationBanner, existing: unknown, r: CompileResolvers): unknown {
  const base = (existing ?? {}) as Record<string, any>;
  const out: Record<string, any> = { ...base };
  if (rep.placement !== undefined) out.embedPlacement = rep.placement;
  if (rep.zIndex !== undefined) out.zIndex = rep.zIndex;
  if (rep.content !== undefined)
    out.contents = compileContent(rep.content, base.contents, r, 'banner-dismis');
  if (rep.settings !== undefined) {
    const s = rep.settings;
    if (s.overlayOverAppContent !== undefined)
      out.overlayEmbedOverAppContent = s.overlayOverAppContent;
    if (s.stickToTop !== undefined) out.stickToTopOfViewport = s.stickToTop;
    if (s.allowDismiss !== undefined) out.allowUsersToDismissEmbed = s.allowDismiss;
    if (s.animateOnAppear !== undefined) out.animateWhenEmbedAppears = s.animateOnAppear;
  }
  if (rep.containerTarget !== undefined) {
    out.containerElement = compileTargetToElementData(rep.containerTarget, base.containerElement);
  }
  if (rep.layout !== undefined) {
    const l = rep.layout;
    if (l.maxContentWidth !== undefined) out.maxContentWidth = l.maxContentWidth;
    if (l.maxEmbedWidth !== undefined) out.maxEmbedWidth = l.maxEmbedWidth;
    if (l.borderRadius !== undefined) out.borderRadius = l.borderRadius;
    if (l.outerMargin !== undefined) out.outerMargin = l.outerMargin;
  }
  return out;
}
