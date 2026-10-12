import type { ReferenceRow } from './reference-row.type';

/** Whose segment list a segment referrer lives in, as a GraphQL enum object typed by the row's union. */
export const ReferenceSegmentBizType: {
  [Value in NonNullable<ReferenceRow['segmentBizType']>]: Value;
} = {
  user: 'user',
  company: 'company',
};
