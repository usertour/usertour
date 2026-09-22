import type { Environment } from '@prisma/client';
import type { ClientContext } from '@usertour/types';

/**
 * Base parameters for event tracking
 * These are the common parameters used across most event tracking methods
 */
export interface BaseEventTrackingParams {
  sessionId: string;
  environment: Environment;
  clientContext: ClientContext;
}
