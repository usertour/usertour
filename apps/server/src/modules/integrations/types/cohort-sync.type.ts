/**
 * The provider-agnostic contract between inbound entry adapters and the
 * cohort-sync engine (ADR 0012 §2). Entry adapters authenticate and parse a
 * provider's payload into exactly this; the engine never sees provider
 * shapes.
 */

export interface CohortSyncSource {
  /** The provider-side cohort's stable id. */
  cohortId: string;
  /** Display name — the mapped segment's name follows it. */
  cohortName: string;
}

/**
 * `replace` carries one page of the FULL roster (first sync, error recovery,
 * snapshot expiry); `add`/`remove` are incremental membership changes.
 */
export type CohortSyncAction = 'replace' | 'add' | 'remove';

/** Full-roster paging context — one round's pages share a session id. */
export interface CohortSyncRound {
  sessionId: string;
  /** 1-based page index. */
  page: number;
  totalPages: number;
}

export interface CohortSyncBatch {
  integrationId: string;
  source: CohortSyncSource;
  action: CohortSyncAction;
  /** Bridged identities only — the external user ids, PII already discarded. */
  memberExternalIds: string[];
  /** Members whose identity field was absent — counted, never guessed at. */
  unresolvedCount: number;
  /** Present only for `replace`. */
  round?: CohortSyncRound;
}

export interface CohortSyncResult {
  /** Members resolved to a BizUser — pre-existing or created by this batch. */
  matched: number;
  /** Members whose wire object carried no extractable user id (skipped). */
  unresolved: number;
}
