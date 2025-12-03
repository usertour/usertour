import type { Segment } from '@usertour/types';

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
