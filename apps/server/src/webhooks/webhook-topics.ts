import {
  WEBHOOK_EVENT_TOPIC_PREFIX,
  WEBHOOK_NOISY_EVENTS,
  WEBHOOK_TOPIC_WILDCARD,
} from '@usertour/constants';

/**
 * Topic vocabulary (ADR 0010): a subscription string is one of
 *   "*"                          — every topic (noisy events excepted)
 *   "event.tracked"              — every behavior event (noisy events excepted)
 *   "event.tracked.<codeName>"   — exactly that event
 *
 * Matching is namespace-level for the two prefix forms and EXACT for
 * everything else — never segment-prefix. Dashboard-created custom event
 * codeNames have no charset restriction (they may contain dots), so
 * "event.tracked.my" must not accidentally match "event.tracked.my.event".
 */

/** Topic a behavior event is published under. */
export function buildEventTopic(codeName: string): string {
  return `${WEBHOOK_EVENT_TOPIC_PREFIX}.${codeName}`;
}

/** Whether a subscription list matches a behavior event. */
export function matchesSubscription(subscriptions: string[], codeName: string): boolean {
  const isNoisy = WEBHOOK_NOISY_EVENTS.includes(codeName);
  const topic = buildEventTopic(codeName);

  return subscriptions.some((subscription) => {
    if (subscription === WEBHOOK_TOPIC_WILDCARD || subscription === WEBHOOK_EVENT_TOPIC_PREFIX) {
      return !isNoisy;
    }
    return subscription === topic;
  });
}

/** Whether a string is a syntactically valid subscription (create/update guard). */
export function isValidSubscription(value: string): boolean {
  if (value === WEBHOOK_TOPIC_WILDCARD || value === WEBHOOK_EVENT_TOPIC_PREFIX) {
    return true;
  }
  return (
    value.startsWith(`${WEBHOOK_EVENT_TOPIC_PREFIX}.`) &&
    value.length > WEBHOOK_EVENT_TOPIC_PREFIX.length + 1
  );
}
