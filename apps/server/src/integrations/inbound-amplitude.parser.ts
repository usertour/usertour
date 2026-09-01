import { CohortSyncBatch } from './cohort-sync.types';
import { INBOUND_MAX_MEMBERS, InboundParseError } from './inbound-mixpanel.parser';

/**
 * Amplitude Cohort Webhooks payload (their default template):
 *
 * {
 *   "cohort_name": "My Test Cohort",
 *   "cohort_id": "7khm89cz",
 *   "in_cohort": true,                  // true = entered, false = exited
 *   "computed_time": "1692206763",
 *   "message_id": "…::enter::0",
 *   "users": [ { "user_id": "…" } ]
 * }
 *
 * Unlike Mixpanel there is no full-roster action: membership is maintained
 * purely through enter/exit batches, so the engine's add/remove path carries
 * everything and the replace-round machinery stays unused. Amplitude retries
 * on timeout and may deliver duplicate payloads — the engine's set-based
 * writes make replays no-ops.
 */

const asNonEmptyString = (value: unknown): string | null =>
  typeof value === 'string' && value !== ''
    ? value
    : typeof value === 'number'
      ? String(value)
      : null;

/**
 * Parse one Amplitude webhook body into the engine contract. Same PII
 * discipline as the Mixpanel entry: only the identity field leaves this
 * function; anything else on a user object is dropped unlogged.
 *
 * @param userIdProperty optional bridge override (`inboundConfig`); absent →
 *   the member's `user_id`. The magic value `user_id` is accepted as an
 *   explicit spelling of the default.
 */
export const parseAmplitudeWebhook = (
  body: unknown,
  integrationId: string,
  userIdProperty?: string,
): CohortSyncBatch => {
  const root = (body ?? {}) as Record<string, unknown>;

  if (typeof root.in_cohort !== 'boolean') {
    throw new InboundParseError('Missing in_cohort');
  }
  const cohortId = asNonEmptyString(root.cohort_id);
  if (!cohortId) {
    throw new InboundParseError('Missing cohort_id');
  }
  const cohortName = asNonEmptyString(root.cohort_name) ?? cohortId;

  const users = Array.isArray(root.users) ? root.users : [];
  if (users.length > INBOUND_MAX_MEMBERS) {
    throw new InboundParseError(`Too many users in one request (${users.length})`);
  }

  const identityKey = userIdProperty && userIdProperty !== 'user_id' ? userIdProperty : 'user_id';
  const memberExternalIds: string[] = [];
  let unresolvedCount = 0;
  for (const user of users) {
    const record = (user ?? {}) as Record<string, unknown>;
    const externalId = asNonEmptyString(record[identityKey]);
    if (externalId) {
      memberExternalIds.push(externalId);
    } else {
      unresolvedCount += 1;
    }
  }

  return {
    integrationId,
    source: { cohortId, cohortName },
    action: root.in_cohort ? 'add' : 'remove',
    memberExternalIds,
    unresolvedCount,
  };
};
