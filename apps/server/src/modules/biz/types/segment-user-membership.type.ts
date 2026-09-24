import type { JsonObject } from '@prisma/client/runtime/library';

/** One user added to a manual segment. */
export type SegmentUserMembership = {
  segmentId: string;
  bizUserId: string;
  data?: JsonObject;
};
