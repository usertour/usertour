import type { JsonObject } from '@prisma/client/runtime/library';

/** One company added to a manual segment. */
export type SegmentCompanyMembership = {
  segmentId: string;
  bizCompanyId: string;
  data?: JsonObject;
};
