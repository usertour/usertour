/**
 * Source of truth for the 93 role-gated GraphQL endpoints, their permission
 * tier (R/W/O), and the operation + variable shape to invoke each one. Imported
 * by both:
 *   - permission.e2e-spec.ts (HTTP authorization contract against the test DB)
 *   - scripts in test/smoke/ (manual smoke runs against dev/staging/prod-like
 *     environments using real existing resource ids and tokens)
 *
 * `vars(seed)` takes a generic id map so the same table drives both contexts:
 * e2e passes ids from freshly seeded fixtures, smoke passes ids from env vars
 * pointing at real resources in the target environment.
 *
 * Each row carries its required tier as a literal — keep that the contract,
 * not the server's capability map, so a wrong tier here fails independently of
 * the implementation it's checking.
 */

export const ROLES = ['OWNER', 'ADMIN', 'VIEWER', 'NONE', 'ELSEWHERE'] as const;
export type Role = (typeof ROLES)[number];

/** Permission tier: R = all members, W = ADMIN+OWNER, O = OWNER only. */
export type Tier = 'R' | 'W' | 'O';

/**
 * Roles that must be denied at each tier. Two non-member shapes are tested at
 * every tier so the guard's "is a member of this project" check is exercised
 * against both:
 *   - NONE: a user with no memberships anywhere — catches the trivial bug
 *     "guard lets any authenticated user through".
 *   - ELSEWHERE: a user who is OWNER of a *different* project — catches the
 *     cross-project IDOR shape where the guard checks "user has some
 *     membership" without binding it to the resource's owning project.
 */
export const DENY_ROLES: Record<Tier, Role[]> = {
  R: ['NONE', 'ELSEWHERE'],
  W: ['VIEWER', 'NONE', 'ELSEWHERE'],
  O: ['VIEWER', 'ADMIN', 'NONE', 'ELSEWHERE'],
};

/** Lowest role allowed at each tier — used to assert the query allow direction. */
export const ALLOW_ROLE: Record<Tier, Role> = { R: 'VIEWER', W: 'ADMIN', O: 'OWNER' };

export type Seed = Record<string, string>;

export interface Endpoint {
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

export const ENDPOINTS: Endpoint[] = [
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
    vars: (s) => ({ d: { contentId: s.contentId }, s: s.stepId }),
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
    vars: (s) => ({ a: s.accessTokenId, e: s.environmentId }),
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
    vars: (s) => ({ a: s.accessTokenId, e: s.environmentId }),
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
    vars: (s) => ({ d: { userOnSegment: [{ bizUserId: s.bizUserId, segmentId: s.segmentId }] } }),
  },
  {
    key: 'biz.deleteBizUserOnSegment',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:DeleteBizUserOnSegment!){deleteBizUserOnSegment(data:$d){__typename}}',
    vars: (s) => ({ d: { bizUserIds: [s.bizUserId], segmentId: s.segmentId } }),
  },
  {
    key: 'biz.deleteBizUser',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:BizUserOrCompanyIdsInput!){deleteBizUser(data:$d){__typename}}',
    vars: (s) => ({ d: { environmentId: s.environmentId, ids: [s.bizUserId] } }),
  },
  {
    key: 'biz.deleteBizCompany',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:BizUserOrCompanyIdsInput!){deleteBizCompany(data:$d){__typename}}',
    vars: (s) => ({ d: { environmentId: s.environmentId, ids: [s.bizCompanyId] } }),
  },
  {
    key: 'biz.createBizCompanyOnSegment',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:CreateBizCompanyOnSegment!){createBizCompanyOnSegment(data:$d){__typename}}',
    vars: (s) => ({
      d: { companyOnSegment: [{ bizCompanyId: s.bizCompanyId, segmentId: s.segmentId }] },
    }),
  },
  {
    key: 'biz.deleteBizCompanyOnSegment',
    tier: 'W',
    op: 'mutation',
    doc: 'mutation($d:DeleteBizCompanyOnSegment!){deleteBizCompanyOnSegment(data:$d){__typename}}',
    vars: (s) => ({ d: { bizCompanyIds: [s.bizCompanyId], segmentId: s.segmentId } }),
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
    vars: (s) => ({ d: { projectId: s.projectId, userId: s.removableUserId } }),
  },
  {
    key: 'team.changeTeamMemberRole',
    tier: 'O',
    op: 'mutation',
    doc: 'mutation($d:ChangeTeamMemberRoleInput!){changeTeamMemberRole(data:$d)}',
    vars: (s) => ({ d: { projectId: s.projectId, role: 'ADMIN', userId: s.removableUserId } }),
  },
  {
    key: 'team.cancelInvite',
    tier: 'O',
    op: 'mutation',
    doc: 'mutation($d:CancelInviteInput!){cancelInvite(data:$d)}',
    vars: (s) => ({ d: { inviteId: s.inviteId, projectId: s.projectId } }),
  },
  {
    key: 'team.activeUserProject',
    tier: 'R',
    op: 'mutation',
    doc: 'mutation($d:ActiveUserProjectInput!){activeUserProject(data:$d)}',
    vars: (s) => ({ d: { projectId: s.projectId, userId: 'e2e' } }),
  },
];
