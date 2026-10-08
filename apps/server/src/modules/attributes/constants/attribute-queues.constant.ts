/**
 * Backfills a newly created (or restored) bucketing attribute onto the
 * project's existing users or companies (ADR 0020 §3). One job per
 * definition; idempotent, safe to re-run.
 */
export const QUEUE_ATTRIBUTE_BACKFILL = 'attribute-backfill';

export const ATTRIBUTE_BACKFILL_JOB = 'backfill';

export interface AttributeBackfillJobData {
  attributeId: string;
}
