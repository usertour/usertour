/** One object that still references the target of a reverse-reference lookup. */
export interface ReferenceRow {
  /** What kind of object holds the reference. */
  referrerKind: 'content' | 'segment' | 'theme';
  id: string;
  name: string;
  /** Present when referrerKind === 'content'. */
  contentType?: string;
  /** Human-readable spots, deduped — e.g. "start rules (draft)", "step 2 trigger (published)". */
  where: string[];
}
