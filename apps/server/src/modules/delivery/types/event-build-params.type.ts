import type { AnswerQuestionDto } from '@usertour/types';

/**
 * Parameters for building event data
 * Contains all optional fields that build functions may need
 */
export interface EventBuildParams {
  startReason?: string;
  endReason?: string;
  stepId?: string;
  taskId?: string;
  blockId?: string;
  answer?: AnswerQuestionDto;
}
