import { BizEvents } from '@usertour/types';

/**
 * Behavior events excluded from namespace-level webhook subscriptions
 * ("*" and "event.tracked"). These are orders of magnitude noisier than the
 * rest of the event stream; subscribing to one requires naming its topic
 * explicitly (e.g. "event.tracked.page_viewed").
 */
export const WEBHOOK_NOISY_EVENTS: string[] = [BizEvents.PAGE_VIEWED];

/** Topic namespace prefix for behavior-event webhook messages. */
export const WEBHOOK_EVENT_TOPIC_PREFIX = 'event.tracked';

/** Subscription string that matches every topic (noisy events excepted). */
export const WEBHOOK_TOPIC_WILDCARD = '*';
