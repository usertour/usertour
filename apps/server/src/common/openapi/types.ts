import { AttributeDataTypeNames } from '@/attributes/models/attribute.model';

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
  CONTENT_SESSION_ANSWER = 'contentSessionAnswer',
  QUESTION = 'question',
}

/**
 * Type guard to check if a value is a valid OpenAPI object type
 */
export function isValidOpenApiObjectType(value: string): value is OpenApiObjectType {
  return Object.values(OpenApiObjectType).includes(value as OpenApiObjectType);
}

export function mapDataType(dataType: number): AttributeDataTypeNames {
  switch (dataType) {
    case 1:
      return AttributeDataTypeNames.Number;
    case 2:
      return AttributeDataTypeNames.String;
    case 3:
      return AttributeDataTypeNames.Boolean;
    case 4:
      return AttributeDataTypeNames.List;
    case 5:
      return AttributeDataTypeNames.DateTime;
    case 6:
      return AttributeDataTypeNames.RandomAB;
    case 7:
      return AttributeDataTypeNames.RandomNumber;
    default:
      return AttributeDataTypeNames.String;
  }
}

export function mapBizType(bizType: number): OpenApiObjectType {
  switch (bizType) {
    case 1:
      return OpenApiObjectType.USER;
    case 2:
      return OpenApiObjectType.COMPANY;
    case 3:
      return OpenApiObjectType.COMPANY_MEMBERSHIP;
    case 4:
      return OpenApiObjectType.EVENT_DEFINITION;
    default:
      return OpenApiObjectType.USER;
  }
}

export function mapOpenApiObjectTypeToBizType(scope: OpenApiObjectType): number {
  switch (scope) {
    case OpenApiObjectType.USER:
      return 1;
    case OpenApiObjectType.COMPANY:
      return 2;
    case OpenApiObjectType.COMPANY_MEMBERSHIP:
      return 3;
    case OpenApiObjectType.EVENT_DEFINITION:
      return 4;
    default:
      return 1;
  }
}
