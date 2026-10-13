export * from './hooks/auth';
// The generated contract (ADR 0021) stays inside the package: the hooks read
// it through `./graphql`, and the dashboard gets the domain types the hooks
// export. The pieces below are the exceptions the dashboard still reads raw —
// input types and enums it builds variables with, and three documents it
// runs through Apollo itself. Each document here is a hook the dashboard
// does not have yet; wrapping it removes the export.
export type {
  AnalyticsOrder,
  AnalyticsQuery,
  BizOrder,
  ContentVersionInput,
  CreatSegment,
  OutboundMessageStatus,
  QueryTrackerUsersQuery,
  QueryTrackerUsersQueryVariables,
  SegmentBizType,
  VersionInput,
} from './graphql';
export { CreatePresignedUrlDocument, MeDocument, QueryTrackerUsersDocument } from './graphql';
// The query layer (ADR 0021): typed documents in, one query state out.
export * from './query';
export * from './hooks/gql';
// Domain-specific Apollo wrappers (kept out of the catch-all `gql.ts`).
// New wrappers should land here, organised by settings section, rather
// than growing `gql.ts` further.
export * from './hooks/themes';
export * from './hooks/storage';
export * from './hooks/localizations';
export * from './hooks/account';
export * from './hooks/events';
export * from './hooks/access-tokens';
export * from './hooks/api-tokens';
export * from './hooks/oauth-connections';
export * from './hooks/audit-logs';
export * from './hooks/identity-verification';
export * from './hooks/webhooks';
export * from './hooks/outbound-message';
export * from './hooks/integrations';
export * from './hooks/content';
export * from './hooks/segments';
export * from './hooks/activity-feed';
export * from './hooks/sessions';
export * from './hooks/analytics';
export * from './hooks/references';
export * from './hooks/use-tooltip-target-missing-sessions';
export { useContentCount } from './hooks/use-content-count';
export { useCurrentUserId } from './hooks/use-current-user-id';
export * from './hooks/use-cursor-fetch-more';
