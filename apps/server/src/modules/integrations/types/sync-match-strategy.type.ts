import type { SyncMatchStrategy as SyncMatchStrategyValue } from '@usertour/types';

/** How remote records are paired with local ones, as a GraphQL enum (keys are the wire strings). */
export const SyncMatchStrategy: { [Value in SyncMatchStrategyValue]: Value } = {
  email: 'email',
  remoteField: 'remoteField',
};
