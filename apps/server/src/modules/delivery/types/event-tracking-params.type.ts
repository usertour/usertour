import type { BaseEventTrackingParams } from './base-event-tracking-params.type';
import type { EventBuildParams } from './event-build-params.type';

/**
 * Extended parameters for events that require additional data
 */
export interface EventTrackingParams extends BaseEventTrackingParams, EventBuildParams {}
