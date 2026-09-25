import type { ReferenceLocation } from './reference-location.type';

/** One object that still references the target of a reverse-reference lookup. */
export interface ReferenceRow {
  /** What kind of object holds the reference. */
  referrerKind: 'content' | 'segment' | 'theme';
  id: string;
  name: string;
  /** Present when referrerKind === 'content'. */
  contentType?: string;
  /** Present when referrerKind === 'segment': whose segment list it lives in. */
  segmentBizType?: 'user' | 'company';
  /** Every place it is used, deduped. */
  locations: ReferenceLocation[];
  /** `locations` in English — e.g. "start rules (draft)", "step 2 trigger (published)". */
  where: string[];
}
