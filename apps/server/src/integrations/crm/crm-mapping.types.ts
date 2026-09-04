import {
  CRM_REMOTE_PROPERTY_GROUP,
  crmLocalDataTypeFor,
  crmRemotePropertyNameFor,
} from '@usertour/constants';
import { AttributeBizTypes, BizAttributeTypes } from '@usertour/types';
import type { CrmLocalObject, CrmRemoteObject } from '@usertour/types';
import type {
  HubspotObjectType,
  HubspotProperty,
  HubspotPropertyDefinition,
} from './hubspot-crm-api';

/** The object pairs the mapping layer supports in this milestone (ADR 0013 §1). */
export const CRM_OBJECT_PAIRS: ReadonlyArray<{ remote: CrmRemoteObject; local: CrmLocalObject }> = [
  { remote: 'contact', local: 'user' },
  { remote: 'company', local: 'company' },
];

export const isSupportedObjectPair = (remote: string, local: string): boolean =>
  CRM_OBJECT_PAIRS.some((pair) => pair.remote === remote && pair.local === local);

export const hubspotObjectTypeFor = (remote: CrmRemoteObject): HubspotObjectType =>
  remote === 'contact' ? 'contacts' : 'companies';

export const attributeBizTypeFor = (local: CrmLocalObject): AttributeBizTypes =>
  local === 'user' ? AttributeBizTypes.User : AttributeBizTypes.Company;

/** Remote property type → Usertour attribute data type (ADR 0013 §6). */
export const localDataTypeFor = (property: Pick<HubspotProperty, 'type' | 'fieldType'>): number =>
  crmLocalDataTypeFor(property);

/**
 * The provider property records are matched on: the chosen one, or the
 * provider's own `email` property by default under the email rule.
 */
export const matchRemotePropertyFor = (mapping: {
  matchStrategy: string;
  matchRemoteField?: string | null;
}): string =>
  mapping.matchStrategy === 'email'
    ? mapping.matchRemoteField || 'email'
    : (mapping.matchRemoteField as string);

/** Whether a remote property accepts writes (system and computed ones do not). */
export const isRemotePropertyWritable = (property: HubspotProperty): boolean =>
  !(property.modificationMetadata?.readOnlyValue || property.calculated);

/** The provider-side group every Usertour write-back property lives in. */
export const CRM_REMOTE_GROUP = CRM_REMOTE_PROPERTY_GROUP;

/** Provider property name for a Usertour-owned attribute. */
export const remotePropertyNameFor = crmRemotePropertyNameFor;

/** Provider property definition for a Usertour-owned attribute (created on demand). */
export const remotePropertyDefinitionFor = (
  local: CrmLocalObject,
  attribute: { codeName: string; displayName: string; dataType: number },
): HubspotPropertyDefinition => {
  const base = {
    name: remotePropertyNameFor(local, attribute.codeName),
    label: `Usertour: ${attribute.displayName || attribute.codeName}`,
    groupName: CRM_REMOTE_GROUP.name,
  };
  switch (attribute.dataType) {
    case BizAttributeTypes.Number:
      return { ...base, type: 'number', fieldType: 'number' };
    case BizAttributeTypes.Boolean:
      return { ...base, type: 'bool', fieldType: 'booleancheckbox' };
    case BizAttributeTypes.DateTime:
      return { ...base, type: 'datetime', fieldType: 'date' };
    default:
      return { ...base, type: 'string', fieldType: 'text' };
  }
};
