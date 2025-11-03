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
}

/**
 * WebSocket namespace
 */
export const WEBSOCKET_NAMESPACES_V2 = '/v2';
