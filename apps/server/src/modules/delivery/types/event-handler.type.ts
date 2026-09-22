import type { EventTrackingParams } from './event-tracking-params.type';
import type { TransactionClient } from './transaction-client.type';

/**
 * Event handler interface
 */
export interface EventHandler {
  handle(tx: TransactionClient, params: EventTrackingParams): Promise<boolean>;
}
