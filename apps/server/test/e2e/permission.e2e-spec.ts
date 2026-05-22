import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

import { graphql, isPermissionDenied, signToken } from './auth';
import { createTestApp } from './create-test-app';
import {
  createAttribute,
  createBizUser,
  createContent,
  createEnvironment,
  createEvent,
  createIntegration,
  createIntegrationObjectMapping,
  createLocalization,
  createMembership,
  createProject,
  createSegment,
  createSession,
  createTheme,
  createUser,
  createVersion,
} from './factories';

/**
 * Real HTTP authorization contract for every role-gated GraphQL endpoint.
 *
 * Boots the full app against a test database, seeds one project with a member
 * at each role (OWNER/ADMIN/VIEWER) plus a non-member, and fires real
 * operations via supertest. For each endpoint the spec asserts the *deny*
 * direction for every role that must NOT reach it — the guard throws before
 * the resolver runs, so this is side-effect free even for mutations. For
 * queries it additionally asserts the lowest allowed role is NOT denied
 * (queries are read-only); mutation allow direction is intentionally not
 * exercised over HTTP (it would create/delete/publish/email) — it is covered
 * compositionally by the matrix + decorator unit tests.
 *
 * Each row carries the required tier as a literal (R/W/O), so this file is a
 * self-contained contract: it does not import the server's capability map, and
 * a wrong tier here fails independently of the implementation.
 *
 * Run with DATABASE_URL pointed at a migrated test DB:
 *   DATABASE_URL=...usertour_test... pnpm test:e2e
 */
const ROLES = ['OWNER', 'ADMIN', 'VIEWER', 'NONE'] as const;
type Role = (typeof ROLES)[number];

/** Permission tier: R = all members, W = ADMIN+OWNER, O = OWNER only. */
type Tier = 'R' | 'W' | 'O';

/** Roles that must be denied at each tier (a non-member is denied everywhere). */
const DENY_ROLES: Record<Tier, Role[]> = {
  R: ['NONE'],
  W: ['VIEWER', 'NONE'],
  O: ['VIEWER', 'ADMIN', 'NONE'],
};

/** Lowest role allowed at each tier — used to assert the query allow direction. */
const ALLOW_ROLE: Record<Tier, Role> = { R: 'VIEWER', W: 'ADMIN', O: 'OWNER' };

type Seed = Record<string, string>;

interface Endpoint {
  /** `<module>.<method>` — matches the server's capability map for traceability. */
  key: string;
  tier: Tier;
  op: 'query' | 'mutation';
  doc: string;
  vars: (seed: Seed) => Record<string, any>;
  /**
   * Skip the allow direction even for a query — for resolvers that would reach
   * an external service (Salesforce) when actually executed.
   */
  denyOnly?: boolean;
}

const ENDPOINTS: Endpoint[] = [
  // --- projects (scope: project) ---
  {
    key: 'projects.getProjectConfig',
    tier: 'R',
    op: 'query',
    doc: 'query($p:String!){getProjectConfig(projectId:$p){__typename}}',
    vars: (s) => ({ p: s.projectId }),
  },
  {
    key: 'projects.getProjectLicenseInfo',
    tier: 'O',
    op: 'query',
    doc: 'query($p:String!){getProjectLicenseInfo(projectId:$p){__typename}}',
    vars: (s) => ({ p: s.projectId }),
  },
  {
    key: 'projects.updateProjectName',
    tier: 'O',
    op: 'mutation',
    doc: 'mutation($n:String!,$p:String!){updateProjectName(name:$n,projectId:$p){__typename}}',
    vars: (s) => ({ n: 'e2e', p: s.projectId }),
  },
  {
    key: 'projects.updateProjectLicense',
    tier: 'O',
    op: 'mutation',
    doc: 'mutation($l:String!,$p:String!){updateProjectLicense(license:$l,projectId:$p){__typename}}',
    vars: (s) => ({ l: 'e2e', p: s.projectId }),
  },

  // --- content (scope: content) ---
  {
    key: 'content.createContent',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:ContentInput!){createContent(data:$d){__typename}}',
    vars: (s) => ({ d: { type: 'flow', environmentId: s.environmentId } }),
  },
  {
    key: 'content.updateContent',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:ContentUpdateInput!){updateContent(data:$d){__typename}}',
    vars: (s) => ({ d: { contentId: s.contentId, content: {} } }),
  },
  {
    key: 'content.duplicateContent',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:ContentDuplicateInput!){duplicateContent(data:$d){__typename}}',
    vars: (s) => ({ d: { contentId: s.contentId } }),
  },
  {
    key: 'content.getContent',
    tier: 'R',
    op: 'query',
    doc: 'query($c:String!){getContent(contentId:$c){__typename}}',
    vars: (s) => ({ c: s.contentId }),
  },
  {
    key: 'content.createContentVersion',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:ContentVersionInput!){createContentVersion(data:$d){__typename}}',
    vars: (s) => ({ d: { versionId: s.versionId } }),
  },
  {
    key: 'content.getContentVersion',
    tier: 'R',
    op: 'query',
    doc: 'query($v:String!){getContentVersion(versionId:$v){__typename}}',
    vars: (s) => ({ v: s.versionId }),
  },
  {
    key: 'content.updateContentVersion',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:VersionUpdateInput!){updateContentVersion(data:$d){__typename}}',
    vars: (s) => ({ d: { versionId: s.versionId, content: {} } }),
  },
  {
    key: 'content.restoreContentVersion',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:VersionIdInput!){restoreContentVersion(data:$d){__typename}}',
    vars: (s) => ({ d: { versionId: s.versionId } }),
  },
  {
    key: 'content.publishedContentVersion',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:VersionIdInput!){publishedContentVersion(data:$d){__typename}}',
    vars: (s) => ({ d: { versionId: s.versionId } }),
  },
  {
    key: 'content.unpublishedContentVersion',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:ContentIdInput!){unpublishedContentVersion(data:$d){__typename}}',
    vars: (s) => ({ d: { contentId: s.contentId } }),
  },
  {
    key: 'content.deleteContent',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:ContentIdInput!){deleteContent(data:$d){__typename}}',
    vars: (s) => ({ d: { contentId: s.contentId } }),
  },
  {
    key: 'content.listContentVersions',
    tier: 'R',
    op: 'query',
    doc: 'query($c:String!){listContentVersions(contentId:$c){__typename}}',
    vars: (s) => ({ c: s.contentId }),
  },
  {
    key: 'content.addContentSteps',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:ContentStepsInput!){addContentSteps(data:$d){__typename}}',
    vars: (s) => ({
      d: { contentId: s.contentId, steps: [], themeId: s.themeId, versionId: s.versionId },
    }),
  },
  {
    key: 'content.addContentStep',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:CreateStepInput!){addContentStep(data:$d){__typename}}',
    vars: (s) => ({ d: { type: 'tooltip', versionId: s.versionId, contentId: s.contentId } }),
  },
  {
    key: 'content.updateContentStep',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:UpdateStepInput!,$s:String!){updateContentStep(data:$d,stepId:$s){__typename}}',
    vars: (s) => ({ d: { contentId: s.contentId }, s: 'e2e-step' }),
  },
  {
    key: 'content.findManyVersionLocations',
    tier: 'R',
    op: 'query',
    doc: 'query($v:String!){findManyVersionLocations(versionId:$v){__typename}}',
    vars: (s) => ({ v: s.versionId }),
  },
  {
    key: 'content.updateVersionLocationData',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:VersionUpdateLocalizationInput!){updateVersionLocationData(data:$d){__typename}}',
    vars: (s) => ({
      d: {
        backup: {},
        enabled: true,
        localizationId: s.localizationId,
        localized: {},
        versionId: s.versionId,
      },
    }),
  },
  {
    key: 'content.queryContent',
    tier: 'R',
    op: 'query',
    doc: 'query($q:ContentQuery){queryContent(query:$q){__typename}}',
    vars: (s) => ({ q: { environmentId: s.environmentId } }),
  },

  // --- environments (scope: project / environment) ---
  {
    key: 'environments.createEnvironments',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:CreateEnvironmentInput!){createEnvironments(data:$d){__typename}}',
    vars: (s) => ({ d: { name: 'e2e', projectId: s.projectId } }),
  },
  {
    key: 'environments.updateEnvironments',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:UpdateEnvironmentInput!){updateEnvironments(data:$d){__typename}}',
    vars: (s) => ({ d: { id: s.environmentId, name: 'e2e' } }),
  },
  {
    key: 'environments.deleteEnvironments',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:DeleteEnvironmentInput!){deleteEnvironments(data:$d){__typename}}',
    vars: (s) => ({ d: { id: s.environmentId } }),
  },
  {
    key: 'environments.userEnvironments',
    tier: 'R',
    op: 'query',
    doc: 'query($p:String!){userEnvironments(projectId:$p){__typename}}',
    vars: (s) => ({ p: s.projectId }),
  },
  {
    key: 'environments.listAccessTokens',
    tier: 'O',
    op: 'query',
    doc: 'query($e:String!){listAccessTokens(environmentId:$e){__typename}}',
    vars: (s) => ({ e: s.environmentId }),
  },
  {
    key: 'environments.getAccessToken',
    tier: 'O',
    op: 'query',
    doc: 'query($a:String!,$e:String!){getAccessToken(accessTokenId:$a,environmentId:$e)}',
    vars: (s) => ({ a: 'e2e', e: s.environmentId }),
  },
  {
    key: 'environments.createAccessToken',
    tier: 'O',
    op: 'mutation',
    doc: 'mutation($e:String!,$i:CreateAccessTokenInput!){createAccessToken(environmentId:$e,input:$i){__typename}}',
    vars: (s) => ({ e: s.environmentId, i: { name: 'e2e' } }),
  },
  {
    key: 'environments.deleteAccessToken',
    tier: 'O',
    op: 'mutation',
    doc: 'mutation($a:String!,$e:String!){deleteAccessToken(accessTokenId:$a,environmentId:$e)}',
    vars: (s) => ({ a: 'e2e', e: s.environmentId }),
  },

  // --- biz (scope: environment / segment) ---
  {
    key: 'biz.queryBizUser',
    tier: 'R',
    op: 'query',
    doc: 'query($o:BizOrder!,$q:BizQuery!){queryBizUser(orderBy:$o,query:$q){__typename}}',
    vars: (s) => ({
      o: { direction: 'asc', field: 'createdAt' },
      q: { environmentId: s.environmentId },
    }),
  },
  {
    key: 'biz.queryBizCompany',
    tier: 'R',
    op: 'query',
    doc: 'query($o:BizOrder!,$q:BizQuery!){queryBizCompany(orderBy:$o,query:$q){__typename}}',
    vars: (s) => ({
      o: { direction: 'asc', field: 'createdAt' },
      q: { environmentId: s.environmentId },
    }),
  },
  {
    key: 'biz.queryBizUserEvents',
    tier: 'R',
    op: 'query',
    doc: 'query($o:BizOrder!,$q:BizEventQuery!){queryBizUserEvents(orderBy:$o,query:$q){__typename}}',
    vars: (s) => ({
      o: { direction: 'asc', field: 'createdAt' },
      q: { environmentId: s.environmentId },
    }),
  },
  {
    key: 'biz.queryBizCompanyEvents',
    tier: 'R',
    op: 'query',
    doc: 'query($o:BizOrder!,$q:BizEventQuery!){queryBizCompanyEvents(orderBy:$o,query:$q){__typename}}',
    vars: (s) => ({
      o: { direction: 'asc', field: 'createdAt' },
      q: { environmentId: s.environmentId },
    }),
  },
  {
    key: 'biz.createSegment',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:CreatSegment!){createSegment(data:$d){__typename}}',
    vars: (s) => ({ d: { bizType: 'USER', dataType: 'ALL', environmentId: s.environmentId } }),
  },
  {
    key: 'biz.updateSegment',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:UpdateSegment!){updateSegment(data:$d){__typename}}',
    vars: (s) => ({ d: { id: s.segmentId } }),
  },
  {
    key: 'biz.deleteSegment',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:DeleteSegment!){deleteSegment(data:$d){__typename}}',
    vars: (s) => ({ d: { id: s.segmentId } }),
  },
  {
    key: 'biz.listSegment',
    tier: 'R',
    op: 'query',
    doc: 'query($e:String){listSegment(environmentId:$e){__typename}}',
    vars: (s) => ({ e: s.environmentId }),
  },
  {
    key: 'biz.createBizUserOnSegment',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:CreateBizUserOnSegment!){createBizUserOnSegment(data:$d){__typename}}',
    vars: (s) => ({ d: { userOnSegment: [{ bizUserId: 'e2e', segmentId: s.segmentId }] } }),
  },
  {
    key: 'biz.deleteBizUserOnSegment',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:DeleteBizUserOnSegment!){deleteBizUserOnSegment(data:$d){__typename}}',
    vars: (s) => ({ d: { bizUserIds: ['e2e'], segmentId: s.segmentId } }),
  },
  {
    key: 'biz.deleteBizUser',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:BizUserOrCompanyIdsInput!){deleteBizUser(data:$d){__typename}}',
    vars: (s) => ({ d: { environmentId: s.environmentId, ids: ['e2e'] } }),
  },
  {
    key: 'biz.deleteBizCompany',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:BizUserOrCompanyIdsInput!){deleteBizCompany(data:$d){__typename}}',
    vars: (s) => ({ d: { environmentId: s.environmentId, ids: ['e2e'] } }),
  },
  {
    key: 'biz.createBizCompanyOnSegment',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:CreateBizCompanyOnSegment!){createBizCompanyOnSegment(data:$d){__typename}}',
    vars: (s) => ({ d: { companyOnSegment: [{ bizCompanyId: 'e2e', segmentId: s.segmentId }] } }),
  },
  {
    key: 'biz.deleteBizCompanyOnSegment',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:DeleteBizCompanyOnSegment!){deleteBizCompanyOnSegment(data:$d){__typename}}',
    vars: (s) => ({ d: { bizCompanyIds: ['e2e'], segmentId: s.segmentId } }),
  },

  // --- integration (all OWNER; scope: environment / integration) ---
  {
    key: 'integration.listIntegrations',
    tier: 'O',
    op: 'query',
    doc: 'query($e:String!){listIntegrations(environmentId:$e){__typename}}',
    vars: (s) => ({ e: s.environmentId }),
  },
  {
    key: 'integration.getIntegration',
    tier: 'O',
    op: 'query',
    doc: 'query($e:String!,$p:String!){getIntegration(environmentId:$e,provider:$p){__typename}}',
    vars: (s) => ({ e: s.environmentId, p: 'salesforce' }),
  },
  {
    key: 'integration.getSalesforceAuthUrl',
    tier: 'O',
    op: 'query',
    denyOnly: true,
    doc: 'query($e:String!,$p:String!){getSalesforceAuthUrl(environmentId:$e,provider:$p)}',
    vars: (s) => ({ e: s.environmentId, p: 'salesforce' }),
  },
  {
    key: 'integration.getSalesforceObjectFields',
    tier: 'O',
    op: 'query',
    denyOnly: true,
    doc: 'query($i:String!){getSalesforceObjectFields(integrationId:$i){__typename}}',
    vars: (s) => ({ i: s.integrationId }),
  },
  {
    key: 'integration.getIntegrationObjectMappings',
    tier: 'O',
    op: 'query',
    doc: 'query($i:String!){getIntegrationObjectMappings(integrationId:$i){__typename}}',
    vars: (s) => ({ i: s.integrationId }),
  },
  {
    key: 'integration.getIntegrationObjectMapping',
    tier: 'O',
    op: 'query',
    doc: 'query($id:String!){getIntegrationObjectMapping(id:$id){__typename}}',
    vars: (s) => ({ id: s.mappingId }),
  },
  {
    key: 'integration.updateIntegration',
    tier: 'O',
    op: 'mutation',
    doc: 'mutation($e:String!,$i:UpdateIntegrationInput!,$p:String!){updateIntegration(environmentId:$e,input:$i,provider:$p){__typename}}',
    vars: (s) => ({ e: s.environmentId, i: {}, p: 'salesforce' }),
  },
  {
    key: 'integration.upsertIntegrationObjectMapping',
    tier: 'O',
    op: 'mutation',
    doc: 'mutation($i:CreateIntegrationObjectMappingInput!,$ii:String!){upsertIntegrationObjectMapping(input:$i,integrationId:$ii){__typename}}',
    vars: (s) => ({
      i: { sourceObjectType: 'account', destinationObjectType: 'company' },
      ii: s.integrationId,
    }),
  },
  {
    key: 'integration.updateIntegrationObjectMapping',
    tier: 'O',
    op: 'mutation',
    doc: 'mutation($id:String!,$i:UpdateIntegrationObjectMappingInput!){updateIntegrationObjectMapping(id:$id,input:$i){__typename}}',
    vars: (s) => ({ id: s.mappingId, i: {} }),
  },
  {
    key: 'integration.deleteIntegrationObjectMapping',
    tier: 'O',
    op: 'mutation',
    doc: 'mutation($id:String!){deleteIntegrationObjectMapping(id:$id)}',
    vars: (s) => ({ id: s.mappingId }),
  },
  {
    key: 'integration.disconnectIntegration',
    tier: 'O',
    op: 'mutation',
    doc: 'mutation($e:String!,$p:String!){disconnectIntegration(environmentId:$e,provider:$p){__typename}}',
    vars: (s) => ({ e: s.environmentId, p: 'salesforce' }),
  },

  // --- localizations (scope: localization) ---
  {
    key: 'localizations.createLocalization',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:CreateLocalizationInput!){createLocalization(data:$d){__typename}}',
    vars: (s) => ({ d: { code: 'fr', locale: 'fr', name: 'French', projectId: s.projectId } }),
  },
  {
    key: 'localizations.updateLocalization',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:UpdateLocalizationInput!){updateLocalization(data:$d){__typename}}',
    vars: (s) => ({ d: { id: s.localizationId } }),
  },
  {
    key: 'localizations.setDefaultLocalization',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($id:String!){setDefaultLocalization(id:$id){__typename}}',
    vars: (s) => ({ id: s.localizationId }),
  },
  {
    key: 'localizations.deleteLocalization',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:DeleteLocalizationInput!){deleteLocalization(data:$d){__typename}}',
    vars: (s) => ({ d: { id: s.localizationId } }),
  },
  {
    key: 'localizations.listLocalizations',
    tier: 'R',
    op: 'query',
    doc: 'query($p:String!){listLocalizations(projectId:$p){__typename}}',
    vars: (s) => ({ p: s.projectId }),
  },

  // --- attributes (scope: attribute) ---
  {
    key: 'attributes.createAttribute',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:CreateAttributeInput!){createAttribute(data:$d){__typename}}',
    vars: (s) => ({
      d: {
        bizType: 1,
        codeName: 'e2e_attr',
        dataType: 1,
        description: 'e2e',
        displayName: 'e2e',
        projectId: s.projectId,
      },
    }),
  },
  {
    key: 'attributes.updateAttribute',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:UpdateAttributeInput!){updateAttribute(data:$d){__typename}}',
    vars: (s) => ({ d: { id: s.attributeId } }),
  },
  {
    key: 'attributes.deleteAttribute',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:DeleteAttributeInput!){deleteAttribute(data:$d){__typename}}',
    vars: (s) => ({ d: { id: s.attributeId } }),
  },
  {
    key: 'attributes.listAttributes',
    tier: 'R',
    op: 'query',
    doc: 'query($b:Int!,$p:String!){listAttributes(bizType:$b,projectId:$p){__typename}}',
    vars: (s) => ({ b: 1, p: s.projectId }),
  },

  // --- themes (scope: theme) ---
  {
    key: 'themes.createTheme',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:CreateThemeInput!){createTheme(data:$d){__typename}}',
    vars: (s) => ({ d: { isDefault: false, name: 'e2e', projectId: s.projectId } }),
  },
  {
    key: 'themes.updateTheme',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:UpdateThemeInput!){updateTheme(data:$d){__typename}}',
    vars: (s) => ({ d: { id: s.themeId } }),
  },
  {
    key: 'themes.setDefaultTheme',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($t:String!){setDefaultTheme(themeId:$t){__typename}}',
    vars: (s) => ({ t: s.themeId }),
  },
  {
    key: 'themes.copyTheme',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:CopyThemeInput!){copyTheme(data:$d){__typename}}',
    vars: (s) => ({ d: { id: s.themeId, name: 'e2e-copy' } }),
  },
  {
    key: 'themes.deleteTheme',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:DeleteThemeInput!){deleteTheme(data:$d){__typename}}',
    vars: (s) => ({ d: { id: s.themeId } }),
  },
  {
    key: 'themes.getTheme',
    tier: 'R',
    op: 'query',
    doc: 'query($t:String!){getTheme(themeId:$t){__typename}}',
    vars: (s) => ({ t: s.themeId }),
  },
  {
    key: 'themes.listThemes',
    tier: 'R',
    op: 'query',
    doc: 'query($p:String!){listThemes(projectId:$p){__typename}}',
    vars: (s) => ({ p: s.projectId }),
  },

  // --- events (scope: event) ---
  {
    key: 'events.createEvent',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:CreateEventInput!){createEvent(data:$d){__typename}}',
    vars: (s) => ({
      d: { attributeIds: [], codeName: 'e2e_event', displayName: 'e2e', projectId: s.projectId },
    }),
  },
  {
    key: 'events.updateEvent',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:UpdateEventInput!){updateEvent(data:$d){__typename}}',
    vars: (s) => ({ d: { id: s.eventId } }),
  },
  {
    key: 'events.deleteEvent',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:DeleteEventInput!){deleteEvent(data:$d){__typename}}',
    vars: (s) => ({ d: { id: s.eventId } }),
  },
  {
    key: 'events.listEvents',
    tier: 'R',
    op: 'query',
    doc: 'query($p:String!){listEvents(projectId:$p){__typename}}',
    vars: (s) => ({ p: s.projectId }),
  },
  {
    key: 'events.listAttributeOnEvents',
    tier: 'R',
    op: 'query',
    doc: 'query($e:String!){listAttributeOnEvents(eventId:$e){__typename}}',
    vars: (s) => ({ e: s.eventId }),
  },

  // --- analytics (scope: content / environment / session) ---
  {
    key: 'analytics.queryContentAnalytics',
    tier: 'R',
    op: 'query',
    doc: 'query($c:String!,$ed:String!,$ev:String!,$sd:String!,$tz:String!){queryContentAnalytics(contentId:$c,endDate:$ed,environmentId:$ev,startDate:$sd,timezone:$tz){__typename}}',
    vars: (s) => ({
      c: s.contentId,
      ed: '2020-01-31',
      ev: s.environmentId,
      sd: '2020-01-01',
      tz: 'UTC',
    }),
  },
  {
    key: 'analytics.queryContentQuestionAnalytics',
    tier: 'R',
    op: 'query',
    doc: 'query($c:String!,$ed:String!,$ev:String!,$sd:String!,$tz:String!){queryContentQuestionAnalytics(contentId:$c,endDate:$ed,environmentId:$ev,startDate:$sd,timezone:$tz)}',
    vars: (s) => ({
      c: s.contentId,
      ed: '2020-01-31',
      ev: s.environmentId,
      sd: '2020-01-01',
      tz: 'UTC',
    }),
  },
  {
    key: 'analytics.queryBizSession',
    tier: 'R',
    op: 'query',
    doc: 'query($o:AnalyticsOrder!,$q:AnalyticsQuery!){queryBizSession(orderBy:$o,query:$q){__typename}}',
    vars: (s) => ({
      o: { direction: 'asc', field: 'createdAt' },
      q: {
        contentId: s.contentId,
        endDate: '2020-01-31',
        environmentId: s.environmentId,
        startDate: '2020-01-01',
        timezone: 'UTC',
      },
    }),
  },
  {
    key: 'analytics.deleteSession',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($s:String!){deleteSession(sessionId:$s)}',
    vars: (s) => ({ s: s.sessionId }),
  },
  {
    key: 'analytics.endSession',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($s:String!){endSession(sessionId:$s)}',
    vars: (s) => ({ s: s.sessionId }),
  },
  {
    key: 'analytics.querySessionDetail',
    tier: 'R',
    op: 'query',
    doc: 'query($s:String!){querySessionDetail(sessionId:$s){__typename}}',
    vars: (s) => ({ s: s.sessionId }),
  },
  {
    key: 'analytics.listSessionsDetail',
    tier: 'R',
    op: 'query',
    doc: 'query($o:AnalyticsOrder!,$q:AnalyticsQuery!){listSessionsDetail(orderBy:$o,query:$q){__typename}}',
    vars: (s) => ({
      o: { direction: 'asc', field: 'createdAt' },
      q: {
        contentId: s.contentId,
        endDate: '2020-01-31',
        environmentId: s.environmentId,
        startDate: '2020-01-01',
        timezone: 'UTC',
      },
    }),
  },
  {
    key: 'analytics.querySessionsByExternalId',
    tier: 'R',
    op: 'query',
    doc: 'query($o:AnalyticsOrder!,$q:SessionQuery!){querySessionsByExternalId(orderBy:$o,query:$q){__typename}}',
    vars: (s) => ({
      o: { direction: 'asc', field: 'createdAt' },
      q: { environmentId: s.environmentId },
    }),
  },
  {
    key: 'analytics.queryTooltipTargetMissingSessions',
    tier: 'R',
    op: 'query',
    doc: 'query($o:AnalyticsOrder!,$q:TooltipTargetMissingQuery!){queryTooltipTargetMissingSessions(orderBy:$o,query:$q){__typename}}',
    vars: (s) => ({
      o: { direction: 'asc', field: 'createdAt' },
      q: {
        contentId: s.contentId,
        endDate: '2020-01-31',
        environmentId: s.environmentId,
        startDate: '2020-01-01',
        stepCvid: 'e2e',
        timezone: 'UTC',
      },
    }),
  },
  {
    key: 'analytics.queryTrackerUsers',
    tier: 'R',
    op: 'query',
    doc: 'query($o:AnalyticsOrder!,$q:AnalyticsQuery!){queryTrackerUsers(orderBy:$o,query:$q){__typename}}',
    vars: (s) => ({
      o: { direction: 'asc', field: 'createdAt' },
      q: {
        contentId: s.contentId,
        endDate: '2020-01-31',
        environmentId: s.environmentId,
        startDate: '2020-01-01',
        timezone: 'UTC',
      },
    }),
  },

  // --- team (scope: project) ---
  {
    key: 'team.getInvites',
    tier: 'O',
    op: 'query',
    doc: 'query($p:String!){getInvites(projectId:$p){__typename}}',
    vars: (s) => ({ p: s.projectId }),
  },
  {
    key: 'team.getTeamMembers',
    tier: 'O',
    op: 'query',
    doc: 'query($p:String!){getTeamMembers(projectId:$p){__typename}}',
    vars: (s) => ({ p: s.projectId }),
  },
  {
    key: 'team.inviteTeamMember',
    tier: 'O',
    op: 'mutation',
    doc: 'mutation($d:InviteTeamMemberInput!){inviteTeamMember(data:$d)}',
    vars: (s) => ({
      d: { email: 'e2e@test.local', name: 'e2e', projectId: s.projectId, role: 'VIEWER' },
    }),
  },
  {
    key: 'team.removeTeamMember',
    tier: 'O',
    op: 'mutation',
    doc: 'mutation($d:RemoveTeamMemberInput!){removeTeamMember(data:$d)}',
    vars: (s) => ({ d: { projectId: s.projectId, userId: 'e2e' } }),
  },
  {
    key: 'team.changeTeamMemberRole',
    tier: 'O',
    op: 'mutation',
    doc: 'mutation($d:ChangeTeamMemberRoleInput!){changeTeamMemberRole(data:$d)}',
    vars: (s) => ({ d: { projectId: s.projectId, role: 'ADMIN', userId: 'e2e' } }),
  },
  {
    key: 'team.cancelInvite',
    tier: 'O',
    op: 'mutation',
    doc: 'mutation($d:CancelInviteInput!){cancelInvite(data:$d)}',
    vars: (s) => ({ d: { inviteId: 'e2e', projectId: s.projectId } }),
  },
  {
    key: 'team.activeUserProject',
    tier: 'R',
    op: 'mutation',
    doc: 'mutation($d:ActiveUserProjectInput!){activeUserProject(data:$d)}',
    vars: (s) => ({ d: { projectId: s.projectId, userId: 'e2e' } }),
  },
];

describe('Permission authorization (HTTP e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const token = {} as Record<Role, string>;
  const seed: Seed = {};

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const project = await createProject(prisma, { name: 'perm-e2e' });
    seed.projectId = project.id;
    for (const role of ROLES) {
      const user = await createUser(prisma);
      seed[`user_${role}`] = user.id;
      token[role] = signToken(app, user.id);
      if (role !== 'NONE') {
        await createMembership(prisma, user.id, project.id, role);
      }
    }

    const environment = await createEnvironment(prisma, project.id, { name: 'e2e-env' });
    const content = await createContent(prisma, project.id, environment.id);
    const version = await createVersion(prisma, content.id);
    const bizUser = await createBizUser(prisma, environment.id);
    const session = await createSession(prisma, {
      bizUserId: bizUser.id,
      contentId: content.id,
      versionId: version.id,
    });
    const attribute = await createAttribute(prisma, project.id);
    const theme = await createTheme(prisma, project.id);
    const event = await createEvent(prisma, project.id);
    const localization = await createLocalization(prisma, project.id);
    const segment = await createSegment(prisma, project.id, environment.id);
    const integration = await createIntegration(prisma, environment.id);
    const mapping = await createIntegrationObjectMapping(prisma, integration.id);
    Object.assign(seed, {
      environmentId: environment.id,
      contentId: content.id,
      versionId: version.id,
      sessionId: session.id,
      attributeId: attribute.id,
      themeId: theme.id,
      eventId: event.id,
      localizationId: localization.id,
      segmentId: segment.id,
      integrationId: integration.id,
      mappingId: mapping.id,
    });
  }, 60000);

  afterAll(async () => {
    if (prisma && seed.projectId) {
      await prisma.integrationObjectMapping.deleteMany({
        where: { integrationId: seed.integrationId },
      });
      await prisma.integration.deleteMany({ where: { environmentId: seed.environmentId } });
      await prisma.bizSession.deleteMany({ where: { contentId: seed.contentId } });
      await prisma.bizUser.deleteMany({ where: { environmentId: seed.environmentId } });
      // findManyVersionLocations (allow direction) materializes these rows.
      await prisma.versionOnLocalization.deleteMany({ where: { versionId: seed.versionId } });
      await prisma.version.deleteMany({ where: { contentId: seed.contentId } });
      await prisma.content.deleteMany({ where: { projectId: seed.projectId } });
      await prisma.segment.deleteMany({ where: { projectId: seed.projectId } });
      await prisma.localization.deleteMany({ where: { projectId: seed.projectId } });
      await prisma.event.deleteMany({ where: { projectId: seed.projectId } });
      await prisma.theme.deleteMany({ where: { projectId: seed.projectId } });
      await prisma.attribute.deleteMany({ where: { projectId: seed.projectId } });
      await prisma.environment.deleteMany({ where: { projectId: seed.projectId } });
      await prisma.userOnProject.deleteMany({ where: { projectId: seed.projectId } });
      await prisma.user.deleteMany({
        where: { id: { in: ROLES.map((role) => seed[`user_${role}`]) } },
      });
      await prisma.project.deleteMany({ where: { id: seed.projectId } });
    }
    await app?.close();
  });

  const denied = (role: Role, ep: Endpoint) =>
    graphql(app, { query: ep.doc, variables: ep.vars(seed), token: token[role] }).then(
      isPermissionDenied,
    );

  it('covers every role-gated endpoint', () => {
    expect(ENDPOINTS).toHaveLength(93);
  });

  for (const ep of ENDPOINTS) {
    describe(ep.key, () => {
      for (const role of DENY_ROLES[ep.tier]) {
        it(`denies ${role}`, async () => {
          expect(await denied(role, ep)).toBe(true);
        });
      }
      // The allow direction is exercised for queries only: they don't destroy
      // fixtures or reach external services (a few lazily materialize a child
      // row, which teardown cleans up). Mutation allow is not fired — it would
      // create/delete/publish/email — and is covered by the unit matrix.
      // `denyOnly` further skips queries that would call an external service.
      if (ep.op === 'query' && !ep.denyOnly) {
        const role = ALLOW_ROLE[ep.tier];
        it(`allows ${role}`, async () => {
          expect(await denied(role, ep)).toBe(false);
        });
      }
    });
  }
});
