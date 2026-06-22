import { Capability } from '@usertour/types';

/**
 * Maps every role-gated GraphQL resolver endpoint to the capability it
 * requires. Keyed by `'<module>.<method>'` (the resolver class's module
 * directory + the resolver method name).
 *
 * This is the single source of truth for the P2 migration (each endpoint's
 * `@RequirePermission(...)` is taken from here) and for the snapshot
 * baseline test, which asserts that the role set granting each capability
 * (via ROLE_CAPABILITIES) equals the endpoint's current `@Roles` list.
 *
 * NOT yet wired into any guard — endpoints still carry their `@Roles`
 * decorators. This map only records the intended capability per endpoint.
 *
 * The trailing comment on each group is the current `@Roles` set:
 *   R = [VIEWER, ADMIN, OWNER]   W = [ADMIN, OWNER]   O = [OWNER]
 */
export const ENDPOINT_CAPABILITY: Record<string, Capability> = {
  // projects
  'projects.getProjectConfig': Capability.ProjectRead, // R
  'projects.getProjectLicenseInfo': Capability.BillingRead, // O
  'projects.updateProject': Capability.ProjectManage, // O
  'projects.updateProjectLicense': Capability.BillingManage, // O

  // content
  'content.createContent': Capability.ContentCreate, // W
  'content.updateContent': Capability.ContentUpdate, // W
  'content.duplicateContent': Capability.ContentCreate, // W
  'content.getContent': Capability.ContentRead, // R
  'content.createContentVersion': Capability.ContentUpdate, // W
  'content.getContentVersion': Capability.ContentRead, // R
  'content.updateContentVersion': Capability.ContentUpdate, // W
  'content.restoreContentVersion': Capability.ContentUpdate, // W
  'content.publishedContentVersion': Capability.ContentPublish, // W
  'content.unpublishedContentVersion': Capability.ContentPublish, // W
  'content.deleteContent': Capability.ContentDelete, // W
  'content.listContentVersions': Capability.ContentRead, // R
  'content.findManyVersionLocations': Capability.ContentRead, // R
  'content.updateVersionLocationData': Capability.ContentUpdate, // W
  'content.queryContent': Capability.ContentRead, // R

  // environments
  'environments.createEnvironments': Capability.EnvironmentManage, // W
  'environments.updateEnvironments': Capability.EnvironmentManage, // W
  'environments.deleteEnvironments': Capability.EnvironmentManage, // W
  'environments.userEnvironments': Capability.EnvironmentRead, // R
  'environments.verifyInstallation': Capability.EnvironmentRead, // R
  'environments.listAccessTokens': Capability.AccessTokenRead, // O
  'environments.getAccessToken': Capability.AccessTokenRead, // O
  'environments.createAccessToken': Capability.AccessTokenManage, // O
  'environments.deleteAccessToken': Capability.AccessTokenManage, // O

  // biz
  'biz.queryBizUser': Capability.BizdataRead, // R
  'biz.queryBizCompany': Capability.BizdataRead, // R
  'biz.queryBizUserEvents': Capability.BizdataRead, // R
  'biz.queryBizCompanyEvents': Capability.BizdataRead, // R
  'biz.createSegment': Capability.SegmentCreate, // W
  'biz.updateSegment': Capability.SegmentUpdate, // W
  'biz.deleteSegment': Capability.SegmentDelete, // W
  'biz.listSegment': Capability.SegmentRead, // R
  'biz.createBizUserOnSegment': Capability.SegmentUpdate, // W
  'biz.deleteBizUserOnSegment': Capability.SegmentUpdate, // W
  'biz.deleteBizUser': Capability.BizdataDelete, // W
  'biz.deleteBizCompany': Capability.BizdataDelete, // W
  'biz.createBizCompanyOnSegment': Capability.SegmentUpdate, // W
  'biz.deleteBizCompanyOnSegment': Capability.SegmentUpdate, // W

  // integration (all O)
  'integration.listIntegrations': Capability.IntegrationRead,
  'integration.getIntegration': Capability.IntegrationRead,
  'integration.getSalesforceAuthUrl': Capability.IntegrationRead,
  'integration.getSalesforceObjectFields': Capability.IntegrationRead,
  'integration.getIntegrationObjectMappings': Capability.IntegrationRead,
  'integration.getIntegrationObjectMapping': Capability.IntegrationRead,
  'integration.updateIntegration': Capability.IntegrationManage,
  'integration.upsertIntegrationObjectMapping': Capability.IntegrationManage,
  'integration.updateIntegrationObjectMapping': Capability.IntegrationManage,
  'integration.deleteIntegrationObjectMapping': Capability.IntegrationManage,
  'integration.disconnectIntegration': Capability.IntegrationManage,

  // localizations
  'localizations.createLocalization': Capability.LocalizationCreate, // W
  'localizations.updateLocalization': Capability.LocalizationUpdate, // W
  'localizations.setDefaultLocalization': Capability.LocalizationUpdate, // W
  'localizations.deleteLocalization': Capability.LocalizationDelete, // W
  'localizations.listLocalizations': Capability.LocalizationRead, // R

  // attributes
  'attributes.createAttribute': Capability.AttributeCreate, // W
  'attributes.updateAttribute': Capability.AttributeUpdate, // W
  'attributes.deleteAttribute': Capability.AttributeDelete, // W
  'attributes.listAttributes': Capability.AttributeRead, // R

  // themes
  'themes.createTheme': Capability.ThemeCreate, // W
  'themes.updateTheme': Capability.ThemeUpdate, // W
  'themes.setDefaultTheme': Capability.ThemeUpdate, // W
  'themes.copyTheme': Capability.ThemeCreate, // W
  'themes.deleteTheme': Capability.ThemeDelete, // W
  'themes.getTheme': Capability.ThemeRead, // R
  'themes.listThemes': Capability.ThemeRead, // R

  // events
  'events.createEvent': Capability.EventCreate, // W
  'events.updateEvent': Capability.EventUpdate, // W
  'events.deleteEvent': Capability.EventDelete, // W
  'events.listEvents': Capability.EventRead, // R
  'events.listAttributeOnEvents': Capability.EventRead, // R

  // analytics
  'analytics.queryContentAnalytics': Capability.AnalyticsRead, // R
  'analytics.queryContentQuestionAnalytics': Capability.AnalyticsRead, // R
  'analytics.queryBizSession': Capability.AnalyticsRead, // R
  'analytics.deleteSession': Capability.SessionManage, // W
  'analytics.endSession': Capability.SessionManage, // W
  'analytics.querySessionDetail': Capability.AnalyticsRead, // R
  'analytics.listSessionsDetail': Capability.AnalyticsRead, // R
  'analytics.querySessionsByExternalId': Capability.AnalyticsRead, // R
  'analytics.queryTooltipTargetMissingSessions': Capability.AnalyticsRead, // R
  'analytics.queryTrackerUsers': Capability.AnalyticsRead, // R

  // team
  'team.getInvites': Capability.TeamRead, // O
  'team.getTeamMembers': Capability.TeamRead, // O
  'team.inviteTeamMember': Capability.TeamManage, // O
  'team.removeTeamMember': Capability.TeamManage, // O
  'team.changeTeamMemberRole': Capability.TeamManage, // O
  'team.cancelInvite': Capability.TeamManage, // O
  'team.activeUserProject': Capability.ProjectActivate, // R
};
