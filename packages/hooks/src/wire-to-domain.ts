/**
 * Wire-to-domain assertions (ADR 0021).
 *
 * Each constant assigns an operation's result type to the domain type the
 * hooks hand to the dashboard. A server or document change that makes the
 * two disagree fails `tsc` on that line, naming the field. Entities whose
 * domain type still differs from the wire on nullability or carries fields
 * the server never sends (GlobalConfig, the oEmbed info) are not listed. An
 * entity leaves the list once the dashboard reads it through a derived type
 * instead.
 */
import type {
  CreateContentMutation,
  GetContentQuery,
  GetContentVersionQuery,
  GetSubscriptionByProjectIdQuery,
  ListAttributesQuery,
  ListContentPublishRecordsQuery,
  ListDefinitionReferencesQuery,
  ListEventsQuery,
  ListLocalizationsQuery,
  ListVersionLocalizationsQuery,
  QueryBizSessionQuery,
  QueryContentQuery,
  QueryContentQuestionAnalyticsQuery,
  UpdateContentVersionMutation,
  UpdateVersionLocalizationMutation,
  UserEnvironmentsQuery,
} from '@usertour/gql';
import type {
  Attribute,
  Content,
  ContentPublishRecord,
  ContentQuestionAnalytics,
  ContentVersion,
  DefinitionReference,
  Environment,
  Event,
  Localization,
  PageInfo,
  Step,
  Subscription,
  VersionOnLocalization,
} from '@usertour/types';

/** The one field an operation's result carries. */
type Result<Operation> = NonNullable<
  Omit<Operation, '__typename'>[keyof Omit<Operation, '__typename'>]
>;
/** The constraints make a changed shape a compile error here rather than a silent `never`. */
type Item<List extends readonly unknown[]> = NonNullable<List[number]>;
type Node<Connection extends { edges?: readonly { node: unknown }[] | null }> = NonNullable<
  NonNullable<Connection['edges']>[number]['node']
>;

export const attribute: Attribute = {} as Item<Result<ListAttributesQuery>>;
export const content: Content = {} as Result<GetContentQuery>;
export const listedContent: Content = {} as Node<Result<QueryContentQuery>>;
export const createdContent: Content = {} as Result<CreateContentMutation>;
export const contentVersion: ContentVersion = {} as Result<GetContentVersionQuery>;
export const savedContentVersion: ContentVersion = {} as Result<UpdateContentVersionMutation>;
export const step: Step = {} as Item<NonNullable<Result<GetContentVersionQuery>['steps']>>;
export const contentPublishRecord: ContentPublishRecord = {} as Node<
  Result<ListContentPublishRecordsQuery>
>;
// Both sides are the domain type while the codegen mapping holds; this line fails when the mapping goes.
export const contentQuestionAnalytics: ContentQuestionAnalytics = {} as Item<
  Result<QueryContentQuestionAnalyticsQuery>
>;
export const definitionReference: DefinitionReference = {} as Item<
  Result<ListDefinitionReferencesQuery>
>;
export const environment: Environment = {} as Item<Result<UserEnvironmentsQuery>>;
export const event: Event = {} as Item<Result<ListEventsQuery>>;
export const localization: Localization = {} as Item<Result<ListLocalizationsQuery>>;
export const pageInfo: PageInfo = {} as NonNullable<Result<QueryBizSessionQuery>['pageInfo']>;
export const subscription: Subscription = {} as Result<GetSubscriptionByProjectIdQuery>;
export const versionOnLocalization: VersionOnLocalization = {} as Item<
  Result<ListVersionLocalizationsQuery>
>;
export const savedVersionOnLocalization: VersionOnLocalization =
  {} as Result<UpdateVersionLocalizationMutation>;
