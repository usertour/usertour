import type { JsonValue } from '@prisma/client/runtime/library';

/** The fields of a segment to change — what BizService.updateSegment takes. */
export type SegmentChanges = {
  id: string;
  name?: string;
  data?: JsonValue;
  columns?: JsonValue;
};
