import { cuid } from '@usertour/helpers';
import { ContentDataType } from '@usertour/types';

import { z } from 'zod';

import { ValidationError } from '@/common/errors/errors';

import { zodIssuesToValidationIssues } from '../shared/zod-issues';

import { dismissVariantFor } from './contract-map';
import { compileContent } from './representation.compile';
import { compileResourceCenter } from './resource-center.compile';
import { representationResourceCenter } from './resource-center.schema';
import { compileActions, compileConditions, CompileResolvers } from './rules.compile';
import { compileTargetToElementData } from './target.compile';
import {
  representationAnnouncement,
  RepresentationAnnouncement,
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
/**
 * Walk a representation data body for any `question` block. Question blocks render
 * only in flow steps; the non-flow data bodies (checklist / launcher / banner /
 * resource-center) share the block union and would accept one, but the runtime
 * doesn't support it — so reject it at write rather than silently shipping a dead
 * survey.
 */
function containsQuestionBlock(data: unknown): boolean {
  let found = false;
  const walk = (x: unknown) => {
    if (found || !x) return;
    if (Array.isArray(x)) {
      for (const item of x) walk(item);
      return;
    }
    if (typeof x === 'object') {
      if ((x as { type?: unknown }).type === 'question') {
        found = true;
        return;
      }
      for (const v of Object.values(x as Record<string, unknown>)) walk(v);
    }
  };
  walk(data);
  return found;
}

export function compileVersionData(
  contentType: string,
  data: unknown,
  existingData: unknown,
  resolvers: CompileResolvers,
): unknown {
  if (containsQuestionBlock(data)) {
    throw new ValidationError(
      `Question (survey) blocks are only supported in flows — not in ${contentType}. Remove the question block, or build the survey as a flow with question blocks in its steps.`,
    );
  }
  switch (contentType) {
    case ContentDataType.TRACKER:
      return compileTracker(parse(representationTracker, data), existingData, resolvers);
    case ContentDataType.CHECKLIST:
      return compileChecklist(parse(representationChecklist, data), existingData, resolvers);
    case ContentDataType.LAUNCHER:
      return compileLauncher(parse(representationLauncher, data), existingData, resolvers);
    case ContentDataType.BANNER:
      return compileBanner(parse(representationBanner, data), existingData, resolvers);
    case ContentDataType.ANNOUNCEMENT:
      return compileAnnouncement(parse(representationAnnouncement, data), existingData, resolvers);
    case ContentDataType.RESOURCE_CENTER:
      return compileResourceCenter(
        parse(representationResourceCenter, data),
        existingData,
        resolvers,
      );
    default:
      throw new ValidationError(`Content type "${contentType}" does not accept a data body`);
  }
}

/**
 * Validate the representation payload against a type schema, mapping failures to
 * E1017 — reporting EVERY issue (with its `data.…` path), not just the first, so
 * a client can fix the whole body in one round-trip.
 */
function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = zodIssuesToValidationIssues(result.error, 'data');
    throw issues.length
      ? ValidationError.fromIssues(issues)
      : new ValidationError('Invalid data body');
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
    out.content = compileContent(
      rep.content,
      base.content,
      r,
      dismissVariantFor(ContentDataType.CHECKLIST),
    );

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
        clickedActions: compileActions(
          it.clickActions ?? [],
          r,
          dismissVariantFor(ContentDataType.CHECKLIST),
        ),
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
      // Derive alignType like a flow tooltip: explicit wins; else giving side or
      // align means "pin here" → `fixed`; else leave the seeded value. Without a
      // `fixed`, the runtime forces align to center (align is ignored in `auto`).
      const derivedAlignType =
        p.alignType ?? (p.side !== undefined || p.align !== undefined ? 'fixed' : undefined);
      t.alignment = {
        ...(base.tooltip?.alignment ?? {}),
        ...(p.side !== undefined ? { side: p.side } : {}),
        ...(p.align !== undefined ? { align: p.align } : {}),
        ...(p.sideOffset !== undefined ? { sideOffset: p.sideOffset } : {}),
        ...(p.alignOffset !== undefined ? { alignOffset: p.alignOffset } : {}),
        ...(derivedAlignType !== undefined ? { alignType: derivedAlignType } : {}),
      };
    }
    if (rep.tooltip.width !== undefined) t.width = rep.tooltip.width;
    if (rep.tooltip.reference !== undefined) t.reference = rep.tooltip.reference;
    if (rep.tooltip.content !== undefined) {
      t.content = compileContent(
        rep.tooltip.content,
        base.tooltip?.content,
        r,
        dismissVariantFor(ContentDataType.LAUNCHER),
      );
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
      b.actions = compileActions(
        rep.behavior.actions,
        r,
        dismissVariantFor(ContentDataType.LAUNCHER),
      );
    out.behavior = b;
  }
  return out;
}

function compileAnnouncement(
  rep: RepresentationAnnouncement,
  existing: unknown,
  r: CompileResolvers,
): unknown {
  const base = (existing ?? {}) as Record<string, any>;
  const out: Record<string, any> = { ...base };
  if (rep.title !== undefined) out.title = rep.title;
  // No DismissVariant is passed to compileContent: announcement has no dismiss
  // action (feed items are marked seen, not dismissed — dismissVariant is null in
  // the capability matrix), so a `dismiss` in the body is rejected upstream by the
  // write guards and compileActions never sees one here.
  if (rep.introContent !== undefined)
    out.introContent = compileContent(rep.introContent, base.introContent, r);
  if (rep.enableReadMore !== undefined) out.enableReadMore = rep.enableReadMore;
  if (rep.readMoreLabel !== undefined) out.readMoreLabel = rep.readMoreLabel;
  if (rep.detailContent !== undefined)
    out.detailContent = compileContent(rep.detailContent, base.detailContent, r);
  if (rep.distribution !== undefined) out.distribution = rep.distribution;
  if (rep.popupConfig !== undefined)
    out.popupConfig = { ...(base.popupConfig ?? {}), style: rep.popupConfig.style };
  return out;
}

function compileBanner(rep: RepresentationBanner, existing: unknown, r: CompileResolvers): unknown {
  const base = (existing ?? {}) as Record<string, any>;
  const out: Record<string, any> = { ...base };
  if (rep.placement !== undefined) out.embedPlacement = rep.placement;
  if (rep.zIndex !== undefined) out.zIndex = rep.zIndex;
  if (rep.content !== undefined)
    out.contents = compileContent(
      rep.content,
      base.contents,
      r,
      dismissVariantFor(ContentDataType.BANNER),
    );
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
