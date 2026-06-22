import { roleCan } from '@usertour/constants';
import { Role } from '@usertour/types';

import { ENDPOINT_CAPABILITY } from './endpoint-capability.map';

/**
 * Compatibility baseline. `ENDPOINT_ROLES` is a frozen snapshot of every
 * role-gated endpoint's current `@Roles` set, captured from the resolvers
 * before any migration. The test asserts that migrating each endpoint to
 * its mapped capability grants EXACTLY the same roles it grants today.
 *
 * If a capability assignment (endpoint-capability.map.ts) or the matrix
 * (ROLE_CAPABILITIES) ever diverges from this snapshot, the test fails —
 * surfacing the change as an explicit decision rather than a silent
 * authorization shift. Pre-existing `@Roles` inconsistencies, if any,
 * show up here too.
 */
const R: Role[] = [Role.VIEWER, Role.ADMIN, Role.OWNER];
const W: Role[] = [Role.ADMIN, Role.OWNER];
const O: Role[] = [Role.OWNER];

const ENDPOINT_ROLES: Record<string, Role[]> = {
  // projects
  'projects.getProjectConfig': R,
  'projects.getProjectLicenseInfo': O,
  'projects.updateProject': O,
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
  'content.findManyVersionLocations': R,
  'content.updateVersionLocationData': W,
  'content.queryContent': R,
  // environments
  'environments.createEnvironments': W,
  'environments.updateEnvironments': W,
  'environments.deleteEnvironments': W,
  'environments.userEnvironments': R,
  'environments.verifyInstallation': R,
  'environments.listAccessTokens': O,
  'environments.getAccessToken': O,
  'environments.createAccessToken': O,
  'environments.deleteAccessToken': O,
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
  'integration.listIntegrations': O,
  'integration.getIntegration': O,
  'integration.getSalesforceAuthUrl': O,
  'integration.getSalesforceObjectFields': O,
  'integration.getIntegrationObjectMappings': O,
  'integration.getIntegrationObjectMapping': O,
  'integration.updateIntegration': O,
  'integration.upsertIntegrationObjectMapping': O,
  'integration.updateIntegrationObjectMapping': O,
  'integration.deleteIntegrationObjectMapping': O,
  'integration.disconnectIntegration': O,
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
  'team.getInvites': O,
  'team.getTeamMembers': O,
  'team.inviteTeamMember': O,
  'team.removeTeamMember': O,
  'team.changeTeamMemberRole': O,
  'team.cancelInvite': O,
  'team.activeUserProject': R,
};

describe('endpoint → capability compatibility baseline', () => {
  it('snapshot covers exactly the same 90 endpoints as the capability map', () => {
    expect(Object.keys(ENDPOINT_ROLES).length).toBe(91);
    expect(Object.keys(ENDPOINT_ROLES).sort()).toEqual(Object.keys(ENDPOINT_CAPABILITY).sort());
  });

  it('each endpoint capability grants exactly the roles its current @Roles grants', () => {
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
