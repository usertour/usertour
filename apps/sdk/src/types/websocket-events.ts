/**
 * WebSocket event names used for communication between client and server
 */
export enum WebSocketEvents {
  // Unified incoming event (from server)
  SERVER_MESSAGE = 'server-message',

  // Unified outgoing event (to server)
  CLIENT_MESSAGE = 'client-message',
}

/**
 * Message kinds for client-message event (Client -> Server)
 * Using PascalCase for consistency
 */
export enum ClientMessageKind {
  UPSERT_USER = 'UpsertUser',
  UPSERT_COMPANY = 'UpsertCompany',
  TRACK_EVENT = 'TrackEvent',
  START_CONTENT = 'StartContent',
  END_CONTENT = 'EndContent',
  GO_TO_STEP = 'GoToStep',
  ANSWER_QUESTION = 'AnswerQuestion',
  CLICK_CHECKLIST_TASK = 'ClickChecklistTask',
  HIDE_CHECKLIST = 'HideChecklist',
  SHOW_CHECKLIST = 'ShowChecklist',
  UPDATE_CLIENT_CONTEXT = 'UpdateClientContext',
  REPORT_TOOLTIP_TARGET_MISSING = 'ReportTooltipTargetMissing',
  TOGGLE_CLIENT_CONDITION = 'ToggleClientCondition',
  FIRE_CONDITION_WAIT_TIMER = 'FireConditionWaitTimer',
  ACTIVATE_LAUNCHER = 'ActivateLauncher',
  DISMISS_LAUNCHER = 'DismissLauncher',
  BEGIN_BATCH = 'BeginBatch',
  END_BATCH = 'EndBatch',
  END_ALL_CONTENT = 'EndAllContent',
}

/**
 * Message kinds for server-message event (Server -> Client)
 * Using PascalCase for consistency
 */
export enum ServerMessageKind {
  SET_FLOW_SESSION = 'SetFlowSession',
  SET_CHECKLIST_SESSION = 'SetChecklistSession',
  UNSET_FLOW_SESSION = 'UnsetFlowSession',
  UNSET_CHECKLIST_SESSION = 'UnsetChecklistSession',
  FORCE_GO_TO_STEP = 'ForceGoToStep',
  TRACK_CLIENT_CONDITION = 'TrackClientCondition',
  UNTRACK_CLIENT_CONDITION = 'UntrackClientCondition',
  START_CONDITION_WAIT_TIMER = 'StartConditionWaitTimer',
  CANCEL_CONDITION_WAIT_TIMER = 'CancelConditionWaitTimer',
  CHECKLIST_TASK_COMPLETED = 'ChecklistTaskCompleted',
}
