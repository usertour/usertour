import type { SyncLocalObject as SyncLocalObjectValue } from '@usertour/types';

/** Usertour object types a remote object can be paired with, as a GraphQL enum (keys are the wire strings). */
export const SyncLocalObject: { [Value in SyncLocalObjectValue]: Value } = {
  user: 'user',
  company: 'company',
};
