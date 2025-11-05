/**
 * Error messages used throughout the application
 */
export enum ErrorMessages {
  FAILED_TO_IDENTIFY_USER = 'Failed to identify user',
  FAILED_TO_UPDATE_USER = 'Failed to update user',
  FAILED_TO_UPDATE_COMPANY = 'Failed to update company',
  FAILED_TO_UPDATE_GROUP = 'Failed to update group',
  MUST_INIT_FIRST = 'You must call usertour.init() first',
  MUST_IDENTIFY_FIRST = 'You must call usertour.identify() first',
  MUST_GROUP_FIRST = 'You must call usertour.group() first',
  INVALID_USER_ID = "usertour.identify: First argument must be a non-empty string representing the user's ID in your database. Value received: {value}",
  INVALID_COMPANY_ID = "usertour.group: First argument must be a non-empty string representing the company's ID in your database. Value received: {value}",
  INVALID_CONTENT_ID = "usertour.start: First argument must be a non-empty string representing the content's ID. Value received: {value}",
  TARGET_MISSING_TIME_EXCEEDED = 'Target missing time cannot exceed 10 seconds',
  SHOW_STEP_BY_CVID_NOT_AVAILABLE = 'showStepByCvid is not available in this context',
  HANDLE_DISMISS_NOT_AVAILABLE = 'handleDismiss is not available in this context',
  FAILED_TO_LOAD_CSS = 'Failed to load CSS after maximum retries',
  FAILED_TO_CREATE_CONTAINER = 'Failed to create container',
  FAILED_TO_CREATE_REACT_ROOT = 'Failed to create React root',
}

/**
 * Helper function to format error message with dynamic value
 */
export function formatErrorMessage(template: string, value: unknown): string {
  return template.replace('{value}', JSON.stringify(value));
}
