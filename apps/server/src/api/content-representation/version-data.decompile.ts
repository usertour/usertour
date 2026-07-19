import { ContentDataType, LauncherDataType } from '@usertour/types';

import { decompileContent } from './representation.decompile';
import { decompileResourceCenter } from './resource-center.decompile';
import { decompileActions, decompileWhen, DecompileResolvers } from './rules.decompile';
import { decompileTarget } from './target.decompile';
import {
  RepresentationAnnouncement,
  RepresentationBanner,
  RepresentationChecklist,
  RepresentationLauncher,
  RepresentationTracker,
  RepresentationVersionData,
} from './version-data.schema';

/**
 * Decompile a version's type-specific `version.data` into its representation,
 * dispatching on the content type. Returns undefined for `flow` (its body is
 * `steps`, not `version.data`) and for unknown types.
 */
export function decompileVersionData(
  contentType: string,
  data: unknown,
  resolvers: DecompileResolvers,
): RepresentationVersionData | undefined {
  switch (contentType) {
    case ContentDataType.TRACKER:
      return decompileTracker(data, resolvers);
    case ContentDataType.CHECKLIST:
      return decompileChecklist(data, resolvers);
    case ContentDataType.LAUNCHER:
      return decompileLauncher(data, resolvers);
    case ContentDataType.BANNER:
      return decompileBanner(data, resolvers);
    case ContentDataType.ANNOUNCEMENT:
      return decompileAnnouncement(data, resolvers);
    case ContentDataType.RESOURCE_CENTER:
      return decompileResourceCenter(data, resolvers);
    default:
      return undefined;
  }
}

function decompileTracker(data: unknown, r: DecompileResolvers): RepresentationTracker {
  const d = (data ?? {}) as { eventId?: unknown };
  const eventId = typeof d.eventId === 'string' && d.eventId ? d.eventId : null;
  return { event: eventId ? r.eventCode(eventId) : null };
}

function decompileChecklist(data: unknown, r: DecompileResolvers): RepresentationChecklist {
  const d = (data ?? {}) as Record<string, any>;
  const items = Array.isArray(d.items) ? d.items : [];
  return {
    buttonText: typeof d.buttonText === 'string' ? d.buttonText : '',
    initialDisplay: d.initialDisplay === 'button' ? 'button' : 'expanded',
    completionOrder: d.completionOrder === 'ordered' ? 'ordered' : 'any',
    preventDismiss: !!d.preventDismissChecklist,
    autoDismiss: !!d.autoDismissChecklist,
    content: decompileContent(d.content, r).blocks,
    items: items.map((it: Record<string, any>) => ({
      ...(typeof it.id === 'string' ? { id: it.id } : {}),
      name: typeof it.name === 'string' ? it.name : '',
      ...(typeof it.description === 'string' ? { description: it.description } : {}),
      completeWhen: decompileWhen(it.completeConditions, r),
      clickActions: decompileActions(it.clickedActions),
      ...(it.onlyShowTask ? { onlyShowWhen: decompileWhen(it.onlyShowTaskConditions, r) } : {}),
    })),
  };
}

function decompileLauncher(data: unknown, r: DecompileResolvers): RepresentationLauncher {
  const d = (data ?? {}) as Record<string, any>;
  const tooltip = (d.tooltip ?? {}) as Record<string, any>;
  const behavior = (d.behavior ?? {}) as Record<string, any>;
  const al = (tooltip.alignment ?? {}) as Record<string, any>;
  const settings = (tooltip.settings ?? {}) as Record<string, any>;
  const target = decompileTarget(d.target?.element);
  return {
    style: (
      [
        LauncherDataType.BEACON,
        LauncherDataType.ICON,
        LauncherDataType.HIDDEN,
        LauncherDataType.BUTTON,
      ] as string[]
    ).includes(d.type)
      ? d.type
      : LauncherDataType.ICON,
    icon: {
      ...(d.iconSource ? { source: d.iconSource } : {}),
      ...(d.iconUrl ? { url: d.iconUrl } : {}),
      ...(d.iconType ? { type: d.iconType } : {}),
    },
    ...(typeof d.buttonText === 'string' ? { buttonText: d.buttonText } : {}),
    ...(typeof d.zIndex === 'number' ? { zIndex: d.zIndex } : {}),
    ...(target ? { target } : {}),
    tooltip: {
      ...(al.side && al.align
        ? {
            placement: {
              side: al.side,
              align: al.align,
              ...(typeof al.sideOffset === 'number' ? { sideOffset: al.sideOffset } : {}),
              ...(typeof al.alignOffset === 'number' ? { alignOffset: al.alignOffset } : {}),
            },
          }
        : {}),
      ...(typeof tooltip.width === 'number' ? { width: tooltip.width } : {}),
      ...(tooltip.reference === 'target' || tooltip.reference === 'launcher'
        ? { reference: tooltip.reference }
        : {}),
      content: decompileContent(tooltip.content, r).blocks,
      settings: {
        ...(typeof settings.dismissAfterFirstActivation === 'boolean'
          ? { dismissAfterFirstActivation: settings.dismissAfterFirstActivation }
          : {}),
        ...(typeof settings.keepTooltipOpenWhenHovered === 'boolean'
          ? { keepOpenWhenHovered: settings.keepTooltipOpenWhenHovered }
          : {}),
        ...(typeof settings.hideLauncherWhenTooltipIsDisplayed === 'boolean'
          ? { hideLauncherWhenTooltipShown: settings.hideLauncherWhenTooltipIsDisplayed }
          : {}),
      },
    },
    behavior: {
      ...(behavior.triggerElement ? { triggerElement: behavior.triggerElement } : {}),
      ...(behavior.triggerEvent ? { event: behavior.triggerEvent } : {}),
      ...(behavior.actionType ? { action: behavior.actionType } : {}),
      actions: decompileActions(behavior.actions),
    },
  };
}

function decompileAnnouncement(data: unknown, r: DecompileResolvers): RepresentationAnnouncement {
  const d = (data ?? {}) as Record<string, any>;
  const distribution = (['silent', 'badge', 'popup'] as const).includes(d.distribution)
    ? d.distribution
    : 'badge';
  return {
    title: typeof d.title === 'string' ? d.title : '',
    introContent: decompileContent(d.introContent, r).blocks,
    enableReadMore: !!d.enableReadMore,
    ...(typeof d.readMoreLabel === 'string' ? { readMoreLabel: d.readMoreLabel } : {}),
    detailContent: decompileContent(d.detailContent, r).blocks,
    distribution,
    // Read-backs carry a concrete style for popup announcements even when the
    // stored config is absent (the runtime default is bubble) — so an agent sees
    // what will actually present, not a hole. A STORED config is also echoed
    // under the other distributions: hiding it made a written popupConfig a
    // ghost (invisible on read, resurfacing when distribution later switched
    // to popup — announcement A+B, L2).
    ...(distribution === 'popup'
      ? { popupConfig: { style: d.popupConfig?.style === 'modal' ? 'modal' : 'bubble' } }
      : d.popupConfig?.style === 'modal' || d.popupConfig?.style === 'bubble'
        ? { popupConfig: { style: d.popupConfig.style } }
        : {}),
  };
}

function decompileBanner(data: unknown, r: DecompileResolvers): RepresentationBanner {
  const d = (data ?? {}) as Record<string, any>;
  const containerTarget = decompileTarget(d.containerElement);
  return {
    ...(d.embedPlacement ? { placement: d.embedPlacement } : {}),
    ...(typeof d.zIndex === 'number' ? { zIndex: d.zIndex } : {}),
    content: decompileContent(d.contents, r).blocks,
    settings: {
      ...(typeof d.overlayEmbedOverAppContent === 'boolean'
        ? { overlayOverAppContent: d.overlayEmbedOverAppContent }
        : {}),
      ...(typeof d.stickToTopOfViewport === 'boolean'
        ? { stickToTop: d.stickToTopOfViewport }
        : {}),
      ...(typeof d.allowUsersToDismissEmbed === 'boolean'
        ? { allowDismiss: d.allowUsersToDismissEmbed }
        : {}),
      ...(typeof d.animateWhenEmbedAppears === 'boolean'
        ? { animateOnAppear: d.animateWhenEmbedAppears }
        : {}),
    },
    ...(containerTarget ? { containerTarget } : {}),
    layout: {
      ...(typeof d.maxContentWidth === 'number' ? { maxContentWidth: d.maxContentWidth } : {}),
      ...(typeof d.maxEmbedWidth === 'number' ? { maxEmbedWidth: d.maxEmbedWidth } : {}),
      ...(typeof d.borderRadius === 'number' ? { borderRadius: d.borderRadius } : {}),
      ...(d.outerMargin ? { outerMargin: d.outerMargin } : {}),
    },
  };
}
