/**
 * WebSocket event names used for communication between client and server
 */
export enum WebSocketEvents {
  // Incoming events (from server)
  SET_FLOW_SESSION = 'set-flow-session',
  SET_CHECKLIST_SESSION = 'set-checklist-session',

  // Outgoing events (to server)
  UPSERT_USER = 'upsert-user',
  UPSERT_COMPANY = 'upsert-company',
  TRACK_EVENT = 'track-event',
  START_FLOW = 'start-flow',
  END_FLOW = 'end-flow',
  GO_TO_STEP = 'go-to-step',
  ANSWER_QUESTION = 'answer-question',
  CLICK_CHECKLIST_TASK = 'click-checklist-task',
  HIDE_CHECKLIST = 'hide-checklist',
  SHOW_CHECKLIST = 'show-checklist',
  UPDATE_CLIENT_CONTEXT = 'update-client-context',
  REPORT_TOOLTIP_TARGET_MISSING = 'report-tooltip-target-missing',
}
