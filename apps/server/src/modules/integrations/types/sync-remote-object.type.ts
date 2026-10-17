import type { SyncRemoteObject as SyncRemoteObjectValue } from '@usertour/types';

/**
 * Provider object types the mapping layer understands, as a GraphQL enum. The
 * keys are the wire strings; the mapped type ties the object to the union in
 * `@usertour/types`, so a member cannot be added to one without the other.
 */
export const SyncRemoteObject: { [Value in SyncRemoteObjectValue]: Value } = {
  contact: 'contact',
  company: 'company',
};
