import { AttributeDataTypeNames } from '@/attributes/models/attribute.model';

/**
 * The `object` discriminator vocabulary for v2 API resources. Owned by this
 * module (not the legacy `common/openapi`) so the v2 surface is self-contained.
 * Values are kept identical to v1's so responses stay byte-for-byte the same
 * (enforced by the v1<->v2 parity e2e).
 */
export enum ApiObjectType {
  CONTENT = 'content',
  USER = 'user',
  COMPANY = 'company',
  COMPANY_MEMBERSHIP = 'companyMembership',
  CONTENT_VERSION = 'contentVersion',
  CONTENT_SESSION = 'contentSession',
  ATTRIBUTE_DEFINITION = 'attributeDefinition',
  EVENT_DEFINITION = 'eventDefinition',
  EVENT = 'event',
  WEBHOOK = 'webhook',
  WEBHOOK_MESSAGE = 'webhookMessage',
  CONTENT_SESSION_ANSWER = 'contentSessionAnswer',
  QUESTION = 'question',
  STEP = 'step',
  BLOCK = 'block',
  THEME = 'theme',
  SEGMENT = 'segment',
  ENVIRONMENT = 'environment',
  CONTENT_ANALYTICS = 'contentAnalytics',
  QUESTION_ANALYTICS = 'questionAnalytics',
}

export function isApiObjectType(value: string): value is ApiObjectType {
  return Object.values(ApiObjectType).includes(value as ApiObjectType);
}

/** Domain attribute `dataType` int -> public type name. */
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

/** Public type name -> domain attribute `dataType` int (inverse of mapDataType). */
export function mapDataTypeToInternal(name: AttributeDataTypeNames): number {
  switch (name) {
    case AttributeDataTypeNames.Number:
      return 1;
    case AttributeDataTypeNames.String:
      return 2;
    case AttributeDataTypeNames.Boolean:
      return 3;
    case AttributeDataTypeNames.List:
      return 4;
    case AttributeDataTypeNames.DateTime:
      return 5;
    case AttributeDataTypeNames.RandomAB:
      return 6;
    case AttributeDataTypeNames.RandomNumber:
      return 7;
    default:
      return 2;
  }
}

/** Domain `bizType` int -> public scope. */
export function mapBizTypeToScope(bizType: number): ApiObjectType {
  switch (bizType) {
    case 1:
      return ApiObjectType.USER;
    case 2:
      return ApiObjectType.COMPANY;
    case 3:
      return ApiObjectType.COMPANY_MEMBERSHIP;
    case 4:
      return ApiObjectType.EVENT_DEFINITION;
    default:
      return ApiObjectType.USER;
  }
}

/** Public scope -> domain `bizType` int. */
export function mapScopeToBizType(scope: ApiObjectType): number {
  switch (scope) {
    case ApiObjectType.USER:
      return 1;
    case ApiObjectType.COMPANY:
      return 2;
    case ApiObjectType.COMPANY_MEMBERSHIP:
      return 3;
    case ApiObjectType.EVENT_DEFINITION:
      return 4;
    default:
      return 1;
  }
}
