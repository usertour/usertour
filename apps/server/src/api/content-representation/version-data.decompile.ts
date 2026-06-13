import { decompileContent } from './representation.decompile';
import { decompileResourceCenter } from './resource-center.decompile';
import { decompileActions, decompileWhen, DecompileResolvers } from './rules.decompile';
import { decompileTarget } from './target.decompile';
import {
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
    case 'tracker':
      return decompileTracker(data, resolvers);
    case 'checklist':
      return decompileChecklist(data, resolvers);
    case 'launcher':
      return decompileLauncher(data, resolvers);
    case 'banner':
      return decompileBanner(data, resolvers);
    case 'resource-center':
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
      ...(it.description ? { description: it.description } : {}),
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
    style: ['beacon', 'icon', 'hidden', 'button'].includes(d.type) ? d.type : 'icon',
    icon: {
      ...(d.iconSource ? { source: d.iconSource } : {}),
      ...(d.iconUrl ? { url: d.iconUrl } : {}),
      ...(d.iconType ? { type: d.iconType } : {}),
    },
    ...(typeof d.buttonText === 'string' ? { buttonText: d.buttonText } : {}),
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

function decompileBanner(data: unknown, r: DecompileResolvers): RepresentationBanner {
  const d = (data ?? {}) as Record<string, any>;
  const containerTarget = decompileTarget(d.containerElement);
  return {
    ...(d.embedPlacement ? { placement: d.embedPlacement } : {}),
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
