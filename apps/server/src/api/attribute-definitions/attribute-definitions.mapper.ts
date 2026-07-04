import { ApiObjectType, mapBizTypeToScope, mapDataType } from '../shared/object-type';
import { Attribute } from './attribute-definitions.schema';

type AttributeNode = {
  id: string;
  createdAt: Date | string;
  dataType: number;
  description: string;
  displayName: string;
  codeName: string;
  bizType: number;
  predefined?: boolean;
};

/** Pure domain-attribute -> API attribute-definition mapping (no DI, unit-testable). */
export function mapAttribute(node: AttributeNode): Attribute {
  return {
    id: node.id,
    object: ApiObjectType.ATTRIBUTE_DEFINITION,
    createdAt: typeof node.createdAt === 'string' ? node.createdAt : node.createdAt.toISOString(),
    dataType: mapDataType(node.dataType),
    description: node.description,
    displayName: node.displayName,
    codeName: node.codeName,
    scope: mapBizTypeToScope(node.bizType),
    predefined: Boolean(node.predefined),
  };
}
