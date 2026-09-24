import type { BizEvents } from '@usertour/types';

import type { EventTrackingParams } from './event-tracking-params.type';

/**
 * Event tracking item for batch tracking
 */
export interface EventTrackingItem {
  eventType: BizEvents;
  params: EventTrackingParams;
}
