import type { AnswerQuestionDto, BizEvents, ClientContext } from '@usertour/types';
import type { Environment, BizSessionWithRelations, Tx } from './schema';

/**
 * Parameters for building event data
 * Contains all optional fields that build functions may need
 */
export interface EventBuildParams {
  startReason?: string;
  endReason?: string;
  stepId?: string;
  taskId?: string;
  answer?: AnswerQuestionDto;
}

/**
 * Base parameters for event tracking
 * These are the common parameters used across most event tracking methods
 */
export interface BaseEventTrackingParams {
  sessionId: string;
  environment: Environment;
  clientContext: ClientContext;
}

/**
 * Extended parameters for events that require additional data
 */
export interface EventTrackingParams extends BaseEventTrackingParams, EventBuildParams {}

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

/**
 * Event tracking item for batch tracking
 */
export interface EventTrackingItem {
  eventType: BizEvents;
  params: EventTrackingParams;
}

/**
 * Event handler configuration
 */
export interface EventHandlerConfig {
  eventName: BizEvents;
  buildEventData: (
    session: BizSessionWithRelations,
    params: EventTrackingParams,
  ) => Record<string, any> | null;
  /**
   * Custom handle function (optional)
   * If provided, this will be used instead of the default trackEventWithSession flow
   */
  handle?: (tx: Tx, params: EventTrackingParams) => Promise<boolean>;
}

/**
 * Event handler interface
 */
export interface EventHandler {
  handle(tx: Tx, params: EventTrackingParams): Promise<boolean>;
}

export interface TrackEventData {
  eventName: string;
  bizSessionId: string;
  userId: string;
  environmentId: string;
  projectId: string;
  eventProperties: Record<string, any>;
  userProperties: Record<string, any>;
}
