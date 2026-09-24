import type { BizEvents } from '@usertour/types';

import type { BizSessionWithRelations } from './biz-session-with-relations.type';
import type { EventTrackingParams } from './event-tracking-params.type';
import type { TransactionClient } from './transaction-client.type';

/**
 * Event handler configuration
 * If a custom handle is provided, buildEventData is optional since the handle manages its own data building
 * If no custom handle is provided, buildEventData is required for the default flow
 */
export type EventHandlerConfig =
  | {
      eventName: BizEvents;
      buildEventData: (
        session: BizSessionWithRelations,
        params: EventTrackingParams,
      ) => Record<string, any> | null;
      handle?: never;
    }
  | {
      eventName: BizEvents;
      buildEventData?: (
        session: BizSessionWithRelations,
        params: EventTrackingParams,
      ) => Record<string, any> | null;
      handle: (tx: TransactionClient, params: EventTrackingParams) => Promise<boolean>;
    };
