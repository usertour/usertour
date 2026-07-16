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

/** Topic published when a content version is published to an environment. */
export const WEBHOOK_CONTENT_PUBLISHED_TOPIC = 'content.published';

/** Config-change topics subscribable by exact name. */
export const WEBHOOK_CONFIG_TOPICS: string[] = [WEBHOOK_CONTENT_PUBLISHED_TOPIC];

/**
 * Subscription strings granted PREFIX semantics: they match every topic in
 * their namespace, including ones added later. Everything else compares
 * exactly — behavior-event codeNames may contain dots, so arbitrary
 * segment-prefix matching would be ambiguous.
 */
export const WEBHOOK_PREFIX_SUBSCRIPTIONS: string[] = [WEBHOOK_EVENT_TOPIC_PREFIX, 'content'];

/** Subscription string that matches every topic (noisy events excepted). */
export const WEBHOOK_TOPIC_WILDCARD = '*';

/**
 * Topic of dashboard-triggered test messages. Not subscribable — a test is
 * addressed to one endpoint directly, bypassing topic matching (but not the
 * enabled switch or the egress guard).
 */
export const WEBHOOK_TEST_TOPIC = 'webhook.test';
