export type ProjectConfig = {
  removeBranding: boolean;
  planType: string;
};

// Upsert user request
export type UpsertUserDto = {
  externalUserId: string;
  attributes?: Record<string, any>;
};

// Upsert company request
export type UpsertCompanyDto = {
  externalCompanyId: string;
  externalUserId: string;
  attributes?: Record<string, any>;
  membership?: Record<string, any>;
};

// Track event request
export type TrackEventDto = {
  externalUserId: string;
  eventName: string;
  sessionId: string;
  eventData: Record<string, any>;
};

// Identity request (for testing)
export type IdentityDto = {
  data: number;
};

export type StartFlowDto = {
  contentId: string;
  stepCvid?: string;
};

export type EndFlowDto = {
  sessionId: string;
  reason: string;
};

export type GoToStepDto = {
  sessionId: string;
  stepId: string;
};

export type AnswerQuestionDto = {
  questionCvid: string;
  questionName: string;
  questionType: string;
  sessionId: string;
  listAnswer?: string[];
  numberAnswer?: number;
  textAnswer?: string;
};

export type ClickChecklistTaskDto = {
  sessionId: string;
  taskId: string;
};

export type HideChecklistDto = {
  sessionId: string;
};

export type ShowChecklistDto = {
  sessionId: string;
};

export type TooltipTargetMissingDto = {
  sessionId: string;
  stepId: string;
};

export type ToggleClientConditionDto = {
  conditionId: string;
  isActive: boolean;
};
