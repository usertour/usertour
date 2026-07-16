import {
  WEBHOOK_CONFIG_TOPICS,
  WEBHOOK_EVENT_TOPIC_PREFIX,
  WEBHOOK_NOISY_EVENTS,
  WEBHOOK_PREFIX_SUBSCRIPTIONS,
  WEBHOOK_TOPIC_WILDCARD,
} from '@usertour/constants';

/**
 * Topic vocabulary (ADR 0010): a subscription string is one of
 *   "*"                          — every topic (noisy events excepted)
 *   "event.tracked"              — every behavior event (noisy events excepted)
 *   "event.tracked.<codeName>"   — exactly that event
 *   "content"                    — every content config topic
 *   "content.published"          — exactly that config topic
 *
 * Prefix semantics exist ONLY for the fixed namespace subscriptions
 * (WEBHOOK_PREFIX_SUBSCRIPTIONS) — never for arbitrary segments. Dashboard
 * custom-event codeNames have no charset restriction (they may contain dots),
 * so "event.tracked.my" must not accidentally match "event.tracked.my.event".
 */

/** Topic a behavior event is published under. */
export function buildEventTopic(codeName: string): string {
  return `${WEBHOOK_EVENT_TOPIC_PREFIX}.${codeName}`;
}

/** Whether a subscription list matches a topic. */
export function matchesTopic(subscriptions: string[], topic: string, isNoisy = false): boolean {
  return subscriptions.some((subscription) => {
    if (subscription === WEBHOOK_TOPIC_WILDCARD) {
      return !isNoisy;
    }
    if (WEBHOOK_PREFIX_SUBSCRIPTIONS.includes(subscription)) {
      return !isNoisy && (topic === subscription || topic.startsWith(`${subscription}.`));
    }
    return subscription === topic;
  });
}

/** Whether a subscription list matches a behavior event. */
export function matchesSubscription(subscriptions: string[], codeName: string): boolean {
  return matchesTopic(
    subscriptions,
    buildEventTopic(codeName),
    WEBHOOK_NOISY_EVENTS.includes(codeName),
  );
}

/** Whether a string is a syntactically valid subscription (create/update guard). */
export function isValidSubscription(value: string): boolean {
  if (value === WEBHOOK_TOPIC_WILDCARD || WEBHOOK_PREFIX_SUBSCRIPTIONS.includes(value)) {
    return true;
  }
  if (WEBHOOK_CONFIG_TOPICS.includes(value)) {
    return true;
  }
  return (
    value.startsWith(`${WEBHOOK_EVENT_TOPIC_PREFIX}.`) &&
    value.length > WEBHOOK_EVENT_TOPIC_PREFIX.length + 1
  );
}
