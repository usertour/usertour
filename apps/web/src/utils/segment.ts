import type { Segment } from '@usertour/types';
import { catalogEntryForSource } from '@/pages/settings/integrations/catalog';

/** True for a segment materialized by inbound cohort sync (ADR 0012). */
export const isSyncedSegment = (segment: Segment): boolean =>
  !!segment.source && segment.source !== 'internal';

/**
 * Display metadata for a synced segment's provider. Falls back to the raw
 * source value so an unknown provider still labels itself instead of hiding.
 */
export const syncedSegmentProvider = (
  segment: Segment,
): { name: string; imagePath?: string } | undefined => {
  if (!isSyncedSegment(segment)) {
    return undefined;
  }
  const entry = catalogEntryForSource(segment.source);
  return entry
    ? { name: entry.name, imagePath: entry.imagePath }
    : { name: segment.source as string };
};

/**
 * Return segments ordered by dataType groups: ALL -> CONDITION -> MANUAL.
 * Preserves original order within each group (assumes input is already time-ordered).
 */
export const filterSegmentsByTypeOrder = (list: Segment[], bizType: string[]): Segment[] => {
  if (!Array.isArray(list) || list.length === 0) return [];

  const base = list.filter((item) => Array.isArray(bizType) && bizType.includes(item.bizType));

  const groupAll = base.filter((s) => String(s.dataType) === 'ALL');
  const groupCondition = base.filter((s) => String(s.dataType) === 'CONDITION');
  const groupManual = base.filter((s) => String(s.dataType) === 'MANUAL');

  return [...groupAll, ...groupCondition, ...groupManual];
};
