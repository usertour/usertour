import type { IntegrationRegion as IntegrationRegionValue } from '@usertour/types';

/** Provider data region, as a GraphQL enum (keys are the wire strings). */
export const IntegrationRegion: { [Value in IntegrationRegionValue]: Value } = {
  US: 'US',
  EU: 'EU',
};
