import { DecompileResolvers } from './rules.decompile';
import { RepresentationTracker, RepresentationVersionData } from './version-data.schema';

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
    default:
      return undefined;
  }
}

function decompileTracker(data: unknown, r: DecompileResolvers): RepresentationTracker {
  const d = (data ?? {}) as { eventId?: unknown };
  const eventId = typeof d.eventId === 'string' && d.eventId ? d.eventId : null;
  return { event: eventId ? r.eventCode(eventId) : null };
}
