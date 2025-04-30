/**
 * Enum for OpenAPI object types
 * Used to standardize and manage object types across the API specification
 */
export enum OpenApiObjectType {
  // Core object types
  CONTENT = 'content',
  USER = 'user',
  COMPANY = 'company',
  COMPANY_MEMBERSHIP = 'companyMembership',
  CONTENT_VERSION = 'contentVersion',
  CONTENT_SESSION = 'contentSession',
  ATTRIBUTE_DEFINITION = 'attributeDefinition',
  EVENT_DEFINITION = 'eventDefinition',
}

/**
 * Type guard to check if a value is a valid OpenAPI object type
 */
export function isValidOpenApiObjectType(value: string): value is OpenApiObjectType {
  return Object.values(OpenApiObjectType).includes(value as OpenApiObjectType);
}
