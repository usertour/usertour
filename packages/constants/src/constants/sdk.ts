import { contentEndReason, contentStartReason } from '@usertour/types';

/**
 * SDK client-side runtime events used for internal communication and coordination
 */
export enum SDKClientEvents {
  // SDK lifecycle events
  DOM_LOADED = 'dom-loaded',
  CSS_LOADED = 'css-loaded',
  CSS_LOADED_FAILED = 'css-loaded-failed',
  CONTAINER_CREATED = 'container-created',
  // Component lifecycle events
  COMPONENT_CLOSED = 'component-closed',
  CONTENT_STARTED = 'content-started',
  CONTENT_CHANGED = 'content-changed',
  // Checklist-specific events
  CHECKLIST_EXPANDED_CHANGE = 'checklist-expanded-change',
  CHECKLIST_FIRST_SEEN = 'checklist-first-seen',
  // Element-related events
  ELEMENT_FOUND = 'element-found',
  ELEMENT_FOUND_TIMEOUT = 'element-found-timeout',
  ELEMENT_CHANGED = 'element-changed',
  // Server message processing results
  SERVER_MESSAGE_SUCCEEDED = 'server-message:succeeded',
  SERVER_MESSAGE_FAILED = 'server-message:failed',
  // Event tracking
  EVENT_REPORTED = 'event-reported',
  // User identified events
  USER_IDENTIFIED_SUCCEEDED = 'user-identified-succeeded',
  // Monitor state change events
  CONDITION_STATE_CHANGED = 'condition-state-changed',
  WAIT_TIMER_STATE_CHANGED = 'wait-timer-state-changed',
  URL_CHANGED = 'url-changed',
  // UI initialization events
  INITIALIZATION_COMPLETE = 'initialization-complete',
  INITIALIZATION_FAILED = 'initialization-failed',
}

/**
 * WebSocket namespace
 */
export const WEBSOCKET_NAMESPACES_V2 = '/v2';
export const flowReasonTitleMap = {
  // Start reasons
  [contentStartReason.START_FROM_CONDITION]: 'Matched auto-start condition',
  [contentStartReason.START_FROM_URL]: 'Started from URL',
  [contentStartReason.START_FROM_SESSION]: 'Started from session',
  [contentStartReason.START_FROM_PROGRAM]: 'Started from program',
  [contentStartReason.START_FROM_CONTENT_ID]: 'Started from content id',
  [contentStartReason.START_FROM_MANUAL]: 'Manually started',
  [contentStartReason.START_FROM_ACTION]: 'Button clicked',
  // End reasons (existing)
  [contentEndReason.USER_CLOSED]: 'User dismissed flow',
  [contentEndReason.ACTION]: 'Ended by action in this flow',
  [contentEndReason.REPLACED]: 'Replaced by another flow',
  [contentEndReason.TOOLTIP_TARGET_MISSING]: 'Tooltip target missing',
  [contentEndReason.CONTENT_NOT_FOUND]: 'Content not found',
  [contentEndReason.SESSION_TIMEOUT]: 'Session timeout',
  [contentEndReason.SYSTEM_CLOSED]: 'System closed',
  [contentEndReason.URL_START_CLOSED]: 'Dismissed due to URL start',
  [contentEndReason.USER_STARTED_OTHER_CONTENT]: 'User started other content',
  [contentEndReason.PROGRAM_STARTED_OTHER_CONTENT]: 'Program started other content',
  [contentEndReason.STEP_NOT_FOUND]: 'Step not found',
  [contentEndReason.AUTO_DISMISSED]: 'Auto dismissed',
  [contentEndReason.UNPUBLISHED_CONTENT]: 'Unpublished content',
  [contentEndReason.END_FROM_PROGRAM]: 'Ended from program',
  [contentEndReason.LAUNCHER_DEACTIVATED]: 'Launcher deactivated',
  // End reasons (new - specific action types)
  [contentEndReason.CLOSE_BUTTON_DISMISS]: 'Dismissed by close button',
  [contentEndReason.BACKDROP_DISMISS]: 'Dismissed by backdrop click',
  [contentEndReason.DISMISS_BUTTON]: 'Dismissed by dismiss button',
  [contentEndReason.TRIGGER_DISMISS]: 'Dismissed by trigger condition',
  [contentEndReason.ACTION_DISMISS]: 'Dismissed by action',
  [contentEndReason.STORE_NOT_FOUND]: 'Store not found',
  [contentEndReason.ADMIN_ENDED]: 'Ended by admin',
};
