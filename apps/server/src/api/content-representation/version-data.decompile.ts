import { decompileContent } from './representation.decompile';
import { decompileActions, decompileConditions, DecompileResolvers } from './rules.decompile';
import {
  RepresentationChecklist,
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
      completeWhen: decompileConditions(it.completeConditions, r),
      clickActions: decompileActions(it.clickedActions),
      ...(it.onlyShowTask
        ? { onlyShowWhen: decompileConditions(it.onlyShowTaskConditions, r) }
        : {}),
    })),
  };
}
