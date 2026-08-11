import { ApiObjectType } from '../shared/object-type';
import { EventDefinition } from './event-definitions.schema';

type EventNode = {
  id: string;
  createdAt: Date | string;
  description: string;
  displayName: string;
  codeName: string;
  predefined: boolean;
  // Present when the query includes the attribute links (v2 read paths do).
  attributeOnEvent?: { attribute: { codeName: string } }[];
};

/** Pure domain-event -> API event-definition mapping (no DI, unit-testable). */
export function mapEventDefinition(node: EventNode): EventDefinition {
  return {
    id: node.id,
    object: ApiObjectType.EVENT_DEFINITION,
    createdAt: new Date(node.createdAt).toISOString(),
    description: node.description,
    displayName: node.displayName,
    codeName: node.codeName,
    predefined: node.predefined,
    attributes: (node.attributeOnEvent ?? []).map((link) => link.attribute.codeName),
  };
}
