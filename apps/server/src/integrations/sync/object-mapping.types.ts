import {
  SYNC_REMOTE_PROPERTY_GROUP,
  localDataTypeFor,
  remotePropertyNameFor,
} from '@usertour/constants';
import { AttributeBizTypes, BizAttributeTypes } from '@usertour/types';
import type { SyncLocalObject, SyncRemoteObject } from '@usertour/types';
import type {
  HubspotObjectType,
  HubspotProperty,
  HubspotPropertyDefinition,
} from './hubspot-crm-api';

/** The object pairs the mapping layer supports in this milestone (ADR 0013 §1). */
export const SYNC_OBJECT_PAIRS: ReadonlyArray<{
  remote: SyncRemoteObject;
  local: SyncLocalObject;
}> = [
  { remote: 'contact', local: 'user' },
  { remote: 'company', local: 'company' },
];

export const isSupportedObjectPair = (remote: string, local: string): boolean =>
  SYNC_OBJECT_PAIRS.some((pair) => pair.remote === remote && pair.local === local);

export const hubspotObjectTypeFor = (remote: SyncRemoteObject): HubspotObjectType =>
  remote === 'contact' ? 'contacts' : 'companies';

export const attributeBizTypeFor = (local: SyncLocalObject): AttributeBizTypes =>
  local === 'user' ? AttributeBizTypes.User : AttributeBizTypes.Company;

/** Remote property type → Usertour attribute data type (ADR 0013 §6); shared with the dashboard. */
export { localDataTypeFor };

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
export const SYNC_REMOTE_GROUP = SYNC_REMOTE_PROPERTY_GROUP;

/** Provider property name for a Usertour-owned attribute. */
export { remotePropertyNameFor };

/** Provider property definition for a Usertour-owned attribute (created on demand). */
export const remotePropertyDefinitionFor = (
  local: SyncLocalObject,
  attribute: { codeName: string; displayName: string; dataType: number },
): HubspotPropertyDefinition => {
  const base = {
    name: remotePropertyNameFor(local, attribute.codeName),
    label: `Usertour: ${attribute.displayName || attribute.codeName}`,
    groupName: SYNC_REMOTE_GROUP.name,
  };
  switch (attribute.dataType) {
    case BizAttributeTypes.Number:
      return { ...base, type: 'number', fieldType: 'number' };
    case BizAttributeTypes.Boolean:
      // A bool property is an enumeration of two: HubSpot refuses to create
      // one without options ("Boolean properties must have exactly two
      // options; one with a value of 'true', the other with a value of
      // 'false'"), and answers 400 — which used to stall a round.
      return {
        ...base,
        type: 'bool',
        fieldType: 'booleancheckbox',
        options: [
          { label: 'True', value: 'true' },
          { label: 'False', value: 'false' },
        ],
      };
    case BizAttributeTypes.DateTime:
      return { ...base, type: 'datetime', fieldType: 'date' };
    default:
      return { ...base, type: 'string', fieldType: 'text' };
  }
};
