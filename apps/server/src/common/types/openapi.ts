/**
 * Enum for OpenAPI object types
 * Used to standardize and manage object types across the API specification
 */
export enum OpenApiObjectType {
  // Core object types
  CONTENT = 'content',
  USER = 'user',
  COMPANY = 'company',
  COMPANY_MEMBERSHIP = 'company_membership',
  VERSION = 'content_version',
  SESSION = 'content_session',
  ATTRIBUTE = 'attribute',
  EVENT = 'event_definition',
}

/**
 * Type guard to check if a value is a valid OpenAPI object type
 */
export function isValidOpenApiObjectType(value: string): value is OpenApiObjectType {
  return Object.values(OpenApiObjectType).includes(value as OpenApiObjectType);
}
