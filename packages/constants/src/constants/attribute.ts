import { EventAttributes } from '@usertour/types';

/**
 * Tracker-specific metadata attributes injected by the system.
 */
export const trackerSystemMetadataAttributes: EventAttributes[] = [
  EventAttributes.EVENT_TRACKER_ID,
  EventAttributes.EVENT_TRACKER_NAME,
  EventAttributes.EVENT_TRACKER_VERSION_ID,
  EventAttributes.EVENT_TRACKER_VERSION_NUMBER,
];

/**
 * Common client context attributes injected by the system.
 */
export const systemClientContextAttributes: EventAttributes[] = [
  EventAttributes.PAGE_URL,
  EventAttributes.VIEWPORT_WIDTH,
  EventAttributes.VIEWPORT_HEIGHT,
];

/**
 * Full reserved attribute set for tracker-reported events.
 * These are system-managed attributes and should not require per-event attribute binding.
 */
export const trackerSystemReservedEventAttributes: EventAttributes[] = [
  ...trackerSystemMetadataAttributes,
  ...systemClientContextAttributes,
];

/**
 * Random bucketing attributes (ADR 0020). A Random A/B attribute holds one of
 * these two values; a Random number attribute holds an integer in
 * `[1, randomMax]`, with `randomMax` bounded below and above.
 */
export const RANDOM_AB_VALUES = ['A', 'B'] as const;
export const RANDOM_NUMBER_RANGE_MIN = 2;
export const RANDOM_NUMBER_RANGE_MAX = 10000;
