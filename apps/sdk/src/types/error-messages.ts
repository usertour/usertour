/**
 * Error messages used throughout the application
 */
export enum ErrorMessages {
  INVALID_TOKEN = 'An error occurred in usertour.init(): missing Usertour.js token. Value received: {value}',
  FAILED_TO_IDENTIFY_USER = 'The API request to create or update user information was unsuccessful. Please check your network connection and ensure the SDK is properly initialized.',
  FAILED_TO_UPDATE_USER = 'The API request to update user attributes was unsuccessful. Please check your network connection and try again.',
  FAILED_TO_UPDATE_COMPANY = 'The API request to create or update company information was unsuccessful. Please check your network connection and ensure the user has been identified first.',
  FAILED_TO_UPDATE_GROUP = 'The API request to update group information was unsuccessful. Please check your network connection and ensure the group has been associated first.',
  MUST_INIT_FIRST = 'You must call usertour.init() first',
  MUST_IDENTIFY_FIRST = 'You must call usertour.identify() first',
  MUST_GROUP_FIRST = 'You must call usertour.group() first',
  INVALID_USER_ID = "An error occurred in usertour.identify(): first argument must be a non-empty string representing the user's ID in your database. Value received: {value}",
  INVALID_COMPANY_ID = "An error occurred in usertour.group(): first argument must be a non-empty string representing the company's ID in your database. Value received: {value}",
  INVALID_CONTENT_ID = "An error occurred in usertour.start(): first argument must be a non-empty string representing the content's ID. Value received: {value}",
  TARGET_MISSING_TIME_EXCEEDED = 'Target missing time cannot exceed 10 seconds',
  SHOW_STEP_BY_CVID_NOT_AVAILABLE = 'The showStepByCvid method is not available in this context',
  FAILED_TO_LOAD_CSS = 'Unable to load CSS stylesheet after maximum retries. Please check your network connection and ensure the CSS file is accessible.',
  FAILED_TO_CREATE_CONTAINER = 'Unable to create UI container element. This may be due to a conflict with existing DOM elements or insufficient permissions.',
  FAILED_TO_CREATE_REACT_ROOT = 'Unable to create React root for rendering. This may indicate a React version compatibility issue or a problem with the DOM structure.',
  DOCUMENT_NOT_FOUND = 'Document not found for container creation. This may indicate that the SDK is running in an environment without a DOM.',
  CONTAINER_NOT_AVAILABLE = 'Container not available for React root creation. Please ensure the container is created before attempting to create the React root.',
  ERROR_UNMOUNTING_REACT_ROOT = 'Error unmounting React root during cleanup.',
  ERROR_REMOVING_CONTAINER = 'Error removing container element during cleanup.',
  UI_INITIALIZATION_FAILED = 'UI initialization failed.',
  UI_INITIALIZATION_RETRYING = 'UI initialization retrying...',
  UI_INITIALIZATION_MAX_RETRIES_EXCEEDED = 'UI initialization failed after maximum retries. Please check your network connection and ensure the SDK is properly initialized.',
  DOCUMENT_NOT_AVAILABLE_FOR_CSS = 'Document not available for CSS loading. This may indicate that the SDK is running in an environment without a DOM.',
}

/**
 * Helper function to format error message with dynamic value
 */
export function formatErrorMessage(template: string, value: unknown): string {
  return template.replace('{value}', JSON.stringify(value));
}
