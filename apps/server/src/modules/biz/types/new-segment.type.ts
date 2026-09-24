import type { JsonValue } from '@prisma/client/runtime/library';

/** A segment to create — what BizService.createSegment takes. */
export type NewSegment = {
  projectId?: string;
  environmentId?: string;
  name?: string;
  columns?: JsonValue;
  /** 1 = user, 2 = company (SegmentBizType). */
  bizType: number;
  /** 1 = all, 2 = condition, 3 = manual (SegmentDataType). */
  dataType: number;
  data?: JsonValue;
  source?: string;
  sourceId?: string | null;
};
