import type { ConditionWaitTimer, CustomContentSession, TrackCondition } from '@usertour/types';

export interface ContentStartResult {
  success: boolean;
  session?: CustomContentSession;
  preTracks?: TrackCondition[];
  hideConditions?: TrackCondition[];
  retrackConditions?: TrackCondition[];
  checklistConditions?: TrackCondition[];
  resourceCenterConditions?: TrackCondition[];
  waitTimers?: ConditionWaitTimer[];
  reason?: string;
  forceGoToStep?: boolean;
  isActivateOtherSockets?: boolean;
  cancelSession?: boolean;
}
