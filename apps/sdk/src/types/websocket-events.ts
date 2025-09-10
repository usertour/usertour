/**
 * WebSocket event names used for communication between client and server
 */
export enum WebSocketEvents {
  // Incoming events (from server)
  SET_FLOW_SESSION = 'set-flow-session',
  SET_CHECKLIST_SESSION = 'set-checklist-session',
  TRACK_CLIENT_CONDITION = 'track-client-condition',
  UNTRACK_CLIENT_CONDITION = 'untrack-client-condition',
  START_CONDITION_WAIT_TIMER = 'start-condition-wait-timer',
  CANCEL_CONDITION_WAIT_TIMER = 'cancel-condition-wait-timer',

  // Outgoing events (to server)
  UPSERT_USER = 'upsert-user',
  UPSERT_COMPANY = 'upsert-company',
  TRACK_EVENT = 'track-event',
  START_CONTENT = 'start-content',
  END_CONTENT = 'end-content',
  GO_TO_STEP = 'go-to-step',
  ANSWER_QUESTION = 'answer-question',
  CLICK_CHECKLIST_TASK = 'click-checklist-task',
  HIDE_CHECKLIST = 'hide-checklist',
  SHOW_CHECKLIST = 'show-checklist',
  UPDATE_CLIENT_CONTEXT = 'update-client-context',
  REPORT_TOOLTIP_TARGET_MISSING = 'report-tooltip-target-missing',
  TOGGLE_CLIENT_CONDITION = 'toggle-client-condition',
  FIRE_CONDITION_WAIT_TIMER = 'fire-condition-wait-timer',
}
