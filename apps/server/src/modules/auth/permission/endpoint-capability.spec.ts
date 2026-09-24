import { roleCan } from '@usertour/constants';
import { Role } from '@usertour/types';

import { ENDPOINT_CAPABILITY } from './endpoint-capability.map';

/**
 * Authorization baseline. `ENDPOINT_ROLES` is a frozen snapshot of the role
 * set every endpoint grants. The test asserts that each endpoint's mapped
 * capability (via ROLE_CAPABILITIES) grants EXACTLY that set, so any change
 * to the map or the matrix surfaces here as an explicit decision rather
 * than a silent authorization shift.
 *
 * History: captured from the pre-migration `@Roles` lists, then deliberately
 * re-anchored for the roles redesign (ADR 0014): EDITOR joined every read /
 * write set; integrations / webhooks / access tokens moved from owner-only to
 * the write tier; team, SSO, project settings, audit and billing-read moved to
 * the admin tier; ownership transfer became its own owner-only endpoint.
 */
const R: Role[] = [Role.VIEWER, Role.EDITOR, Role.ADMIN, Role.OWNER];
const W: Role[] = [Role.EDITOR, Role.ADMIN, Role.OWNER];
const A: Role[] = [Role.ADMIN, Role.OWNER];
const O: Role[] = [Role.OWNER];

const ENDPOINT_ROLES: Record<string, Role[]> = {
  // projects
  'projects.getProjectConfig': R,
  'projects.getProjectLicenseInfo': A,
  'projects.updateProject': A,
  'projects.updateProjectLicense': O,
  // content
  'content.createContent': W,
  'content.updateContent': W,
  'content.duplicateContent': W,
  'content.getContent': R,
  'content.createContentVersion': W,
  'content.getContentVersion': R,
  'content.updateContentVersion': W,
  'content.restoreContentVersion': W,
  'content.publishedContentVersion': W,
  'content.unpublishedContentVersion': W,
  'content.deleteContent': W,
  'content.listContentVersions': R,
  'content.listContentPublishRecords': R,
  'content.listVersionLocalizations': R,
  'content.updateVersionLocalization': W,
  'localizations.translateLocalizationUnits': W,
  'content.queryContent': R,
  // environments
  'environments.createEnvironments': W,
  'environments.updateEnvironments': W,
  'environments.deleteEnvironments': W,
  'environments.userEnvironments': R,
  'environments.verifyInstallation': R,
  'environments.projectHasEnvironmentAccessTokens': W,
  'environments.listAccessTokens': W,
  'environments.getAccessToken': W,
  'environments.createAccessToken': W,
  'environments.deleteAccessToken': W,
  'environments.listSigningSecrets': W,
  'environments.getSigningSecret': W,
  'environments.createSigningSecret': W,
  'environments.revokeSigningSecret': W,
  'environments.setRequireIdentityVerification': W,
  'environments.getIdentityVerificationStats': W,
  'environments.validateIdentityToken': W,
  // biz
  'biz.queryBizUser': R,
  'biz.queryBizCompany': R,
  'biz.queryBizUserEvents': R,
  'biz.queryBizCompanyEvents': R,
  'biz.createSegment': W,
  'biz.updateSegment': W,
  'biz.deleteSegment': W,
  'biz.listSegment': R,
  'biz.createBizUserOnSegment': W,
  'biz.deleteBizUserOnSegment': W,
  'biz.deleteBizUser': W,
  'biz.deleteBizCompany': W,
  'biz.createBizCompanyOnSegment': W,
  'biz.deleteBizCompanyOnSegment': W,
  // integration
  'integration.listIntegrations': W,
  'integration.queryIntegrationMessages': W,
  'integration.upsertIntegration': W,
  'integration.deleteIntegration': W,
  'integration.sendIntegrationTestEvent': W,
  'integration.queryIntegrationSyncedSegments': W,
  'integration.updateIntegrationInbound': W,
  'integration.rotateIntegrationInboundToken': W,
  'integration.updateIntegrationEvents': W,
  'integration.startIntegrationOAuth': W,
  'integration.disconnectIntegrationOAuth': W,
  'integration.listIntegrationObjectMappings': W,
  'integration.listIntegrationRemoteProperties': W,
  'integration.upsertIntegrationObjectMapping': W,
  'integration.deleteIntegrationObjectMapping': W,
  'integration.runIntegrationObjectMappingSync': W,
  'integration.listIntegrationSyncRuns': W,
  'webhooks.listWebhooks': W,
  'webhooks.getWebhook': W,
  'webhooks.queryWebhookMessages': W,
  'webhooks.createWebhook': W,
  'webhooks.updateWebhook': W,
  'webhooks.deleteWebhook': W,
  'webhooks.rotateWebhookSecret': W,
  'webhooks.sendWebhookTestEvent': W,
  'webhooks.resendWebhookMessage': W,
  // localizations
  'localizations.createLocalization': W,
  'localizations.updateLocalization': W,
  'localizations.setDefaultLocalization': W,
  'localizations.deleteLocalization': W,
  'localizations.listLocalizations': R,
  // attributes
  'attributes.createAttribute': W,
  'attributes.updateAttribute': W,
  'attributes.deleteAttribute': W,
  'attributes.listAttributes': R,
  // themes
  'themes.createTheme': W,
  'themes.updateTheme': W,
  'themes.setDefaultTheme': W,
  'themes.copyTheme': W,
  'themes.deleteTheme': W,
  'themes.getTheme': R,
  'themes.listThemes': R,
  // references
  'references.listDefinitionReferences': R,
  // events
  'events.createEvent': W,
  'events.updateEvent': W,
  'events.deleteEvent': W,
  'events.listEvents': R,
  'events.listAttributeOnEvents': R,
  // analytics
  'analytics.queryContentAnalytics': R,
  'analytics.queryContentQuestionAnalytics': R,
  'analytics.queryBizSession': R,
  'analytics.deleteSession': W,
  'analytics.endSession': W,
  'analytics.querySessionDetail': R,
  'analytics.listSessionsDetail': R,
  'analytics.querySessionsByExternalId': R,
  'analytics.queryTooltipTargetMissingSessions': R,
  'analytics.queryTrackerUsers': R,
  // team
  'team.getInvites': A,
  'team.getTeamMembers': A,
  'team.inviteTeamMember': A,
  'team.removeTeamMember': A,
  'team.changeTeamMemberRole': A,
  'team.transferProjectOwnership': O,
  'team.cancelInvite': A,
  'team.activeUserProject': R,
  // audit
  'audit.auditLogs': A,
  // sso
  'sso.createOidcSsoProvider': A,
  'sso.updateSsoProvider': A,
  'sso.deleteSsoProvider': A,
  'sso.listProjectSsoProviders': A,
  'sso.getProjectSsoSettings': A,
  'sso.updateProjectSsoSettings': A,
  // subscription — had NO @Roles before (any signed-in user could call them).
  // Not a pre-migration snapshot: the intended sets, recorded when the gap
  // was closed. Reads are membership-wide because every member's plan gates
  // depend on them; checkout/portal act on the owner's billing.
  'subscription.createCheckoutSession': O,
  'subscription.createPortalSession': O,
  'subscription.getSubscriptionByProjectId': R,
  'subscription.getSubscriptionUsage': R,
};

describe('endpoint → capability compatibility baseline', () => {
  it('snapshot covers exactly the same 129 endpoints as the capability map', () => {
    expect(Object.keys(ENDPOINT_ROLES).length).toBe(129);
    expect(Object.keys(ENDPOINT_ROLES).sort()).toEqual(Object.keys(ENDPOINT_CAPABILITY).sort());
  });

  it('each endpoint capability grants exactly the roles in the baseline', () => {
    const mismatches: string[] = [];
    for (const [endpoint, roles] of Object.entries(ENDPOINT_ROLES)) {
      const capability = ENDPOINT_CAPABILITY[endpoint];
      const granted = (Object.values(Role) as Role[]).filter((role) => roleCan(role, capability));
      const expected = new Set(roles);
      const actual = new Set(granted);
      const same = expected.size === actual.size && [...expected].every((r) => actual.has(r));
      if (!same) {
        mismatches.push(
          `${endpoint}: @Roles=[${[...expected].sort()}] but ${capability}=[${[...actual].sort()}]`,
        );
      }
    }
    expect(mismatches).toEqual([]);
  });
});
