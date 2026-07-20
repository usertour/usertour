import {
  type DecompileResolvers,
  decompileConditions,
} from '../content-representation/rules.decompile';
import { ApiObjectType } from '../shared/object-type';
import type { Segment, SegmentCondition } from './segments.schema';

type SegmentNode = {
  id: string;
  name?: string | null;
  bizType: number; // 1 = user, 2 = company
  dataType: number; // 1 = all, 2 = condition, 3 = manual
  data?: unknown; // conditions (condition segments)
  createdAt: Date | string;
  updatedAt: Date | string;
};

const bizTypeName = (bizType: number): 'user' | 'company' => (bizType === 2 ? 'company' : 'user');
const kindName = (dataType: number): 'all' | 'condition' | 'manual' =>
  dataType === 1 ? 'all' : dataType === 3 ? 'manual' : 'condition';

/**
 * Pure domain-segment -> API segment. Condition segments inline their decompiled
 * conditions (internal ids -> stable codes via the project resolvers).
 */
export function mapSegment(node: SegmentNode, resolvers: DecompileResolvers): Segment {
  const kind = kindName(node.dataType);
  return {
    id: node.id,
    object: ApiObjectType.SEGMENT,
    name: node.name ?? '',
    bizType: bizTypeName(node.bizType),
    kind,
    // The general decompiler emits the full condition union, but stored segment
    // conditions are attribute/group only (the builder offers nothing else and
    // the write path rejects the rest) — narrow to the segment vocabulary.
    ...(kind === 'condition'
      ? { conditions: decompileConditions(node.data, resolvers) as SegmentCondition[] }
      : {}),
    createdAt: new Date(node.createdAt).toISOString(),
    updatedAt: new Date(node.updatedAt).toISOString(),
  };
}
