import type { Environment } from '@prisma/client';
import type { ClientContext } from '@usertour/types';

/**
 * Parameters for event transaction execution
 * Common parameters used in executeEventTransaction and trackCustomEvent
 */
export interface EventTransactionParams {
  environment: Environment;
  sessionId: string;
  clientContext: ClientContext;
  externalUserId: string;
  eventName: string;
  data: Record<string, any>;
}
