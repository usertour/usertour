import { CohortSyncAction, CohortSyncBatch, CohortSyncRound } from './cohort-sync.types';

/**
 * Mixpanel Custom Webhook payload (their cohort-sync spec — note that
 * EVERYTHING except `action` nests inside `parameters`, members included):
 *
 * {
 *   "action": "members" | "add_members" | "remove_members",
 *   "parameters": {
 *     "mixpanel_project_id": "...", "mixpanel_cohort_id": "...",
 *     "mixpanel_cohort_name": "...", "mixpanel_cohort_description": "...",
 *     "mixpanel_session_id": "...",     // groups one full-roster round's pages
 *     "page_info": { "total_pages": N, "page_count": M },   // M is 1-based
 *     "members": [ { "mixpanel_distinct_id": "...", "email": ..., ...exported props } ]
 *   }
 * }
 *
 * "members" is the COMPLETE roster (first sync, error recovery, snapshot
 * expiry) → engine action `replace`; add_members / remove_members are
 * incremental. Members are batched at ~1000 per call, roughly every 30
 * minutes for recurring syncs.
 */

/** Hard cap far above Mixpanel's ~1000-member batches — a request beyond it is malformed or hostile. */
export const INBOUND_MAX_MEMBERS = 5_000;

const ACTION_MAP: Record<string, CohortSyncAction> = {
  members: 'replace',
  add_members: 'add',
  remove_members: 'remove',
};

export class InboundParseError extends Error {}

const asNonEmptyString = (value: unknown): string | null =>
  typeof value === 'string' && value !== ''
    ? value
    : typeof value === 'number'
      ? String(value)
      : null;

/**
 * Parse and identity-bridge one webhook body into the engine contract. PII
 * discipline: only the identity field leaves this function — every other
 * exported member property is dropped here, unlogged.
 *
 * @param userIdProperty optional bridge override (`inboundConfig`); absent →
 *   the member's `mixpanel_distinct_id`. The magic value
 *   `mixpanel_distinct_id` is accepted as an explicit spelling of the default.
 */
export const parseMixpanelWebhook = (
  body: unknown,
  integrationId: string,
  userIdProperty?: string,
): CohortSyncBatch => {
  const root = (body ?? {}) as Record<string, unknown>;
  const action = ACTION_MAP[root.action as string];
  if (!action) {
    throw new InboundParseError(`Unsupported action "${root.action}"`);
  }

  // The wire format nests everything but `action` inside `parameters`, so
  // read through a merged view that also tolerates top-level keys.
  const parameters = {
    ...root,
    ...((root.parameters as Record<string, unknown>) ?? {}),
  } as Record<string, unknown>;
  const cohortId = asNonEmptyString(parameters.mixpanel_cohort_id);
  if (!cohortId) {
    throw new InboundParseError('Missing mixpanel_cohort_id');
  }
  const cohortName = asNonEmptyString(parameters.mixpanel_cohort_name) ?? cohortId;

  const members = Array.isArray(parameters.members) ? parameters.members : [];
  if (members.length > INBOUND_MAX_MEMBERS) {
    throw new InboundParseError(`Too many members in one request (${members.length})`);
  }

  const identityKey =
    userIdProperty && userIdProperty !== 'mixpanel_distinct_id'
      ? userIdProperty
      : 'mixpanel_distinct_id';
  const memberExternalIds: string[] = [];
  let unresolvedCount = 0;
  for (const member of members) {
    const record = (member ?? {}) as Record<string, unknown>;
    const externalId = asNonEmptyString(record[identityKey]);
    if (externalId) {
      memberExternalIds.push(externalId);
    } else {
      unresolvedCount += 1;
    }
  }

  let round: CohortSyncRound | undefined;
  if (action === 'replace') {
    const pageInfo = (parameters.page_info ?? {}) as Record<string, unknown>;
    const totalPages = Number(pageInfo.total_pages) || 1;
    const page = Number(pageInfo.page_count) || 1;
    const sessionId = asNonEmptyString(parameters.mixpanel_session_id) ?? `single-${cohortId}`;
    round = { sessionId, page, totalPages };
  }

  return {
    integrationId,
    source: { cohortId, cohortName },
    action,
    memberExternalIds,
    unresolvedCount,
    round,
  };
};
