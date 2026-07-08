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
