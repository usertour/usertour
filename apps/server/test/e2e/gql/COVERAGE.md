# GraphQL functional e2e coverage

Tracks functional (behavior) e2e coverage of every GraphQL resolver operation.
Auth/permission is covered separately by `test/e2e/permission.e2e-spec.ts` — specs
here run as an authorized user and assert behavior + DB state.

Legend: `[x]` covered · `[ ]` pending · `[~]` documented gap (see note).

## Phase 0 — harness + template
- [x] **themes** — createTheme, updateTheme, setDefaultTheme, copyTheme, deleteTheme, getTheme, listThemes

## Phase 1 — A-class core
- [x] **content** — createContent, updateContent, duplicateContent, getContent, createContentVersion, getContentVersion, updateContentVersion, restoreContentVersion, publishedContentVersion, unpublishedContentVersion, deleteContent, listContentVersions, addContentSteps, addContentStep, updateContentStep, findManyVersionLocations, updateVersionLocationData, queryContent
- [x] **biz** — queryBizUser, queryBizCompany, queryBizUserEvents, queryBizCompanyEvents, createSegment, updateSegment, deleteSegment, listSegment, createBizUserOnSegment, deleteBizUserOnSegment, deleteBizUser, deleteBizCompany, createBizCompanyOnSegment, deleteBizCompanyOnSegment
- [x] **environments** — createEnvironments, updateEnvironments, deleteEnvironments, userEnvironments, listAccessTokens, getAccessToken, createAccessToken, deleteAccessToken
- [x] **attributes** — createAttribute, updateAttribute, deleteAttribute, listAttributes
- [x] **events** — createEvent, updateEvent, deleteEvent, listEvents, listAttributeOnEvents
- [x] **localizations** — createLocalization, updateLocalization, setDefaultLocalization, deleteLocalization, listLocalizations

## Phase 2 — A-class remaining
- [x] **projects** — getProjectConfig, getProjectLicenseInfo, updateProjectName, updateProjectLicense (happy-path = documented gap)
- [x] **team** — getInvites, getTeamMembers, getInvite, inviteTeamMember, removeTeamMember, changeTeamMemberRole, cancelInvite, activeUserProject
- [x] **analytics** — queryContentAnalytics, queryContentQuestionAnalytics, queryBizSession, deleteSession, endSession, querySessionDetail, listSessionsDetail, querySessionsByExternalId, queryTooltipTargetMissingSessions, queryTrackerUsers
- [x] **utilities** — globalConfig, queryOembedInfo (network — graceful-error covered), createPresignedUrl (S3 — branches by env config)
- [x] **users** — me, updateUser, changePassword, changeEmail, createOwnedProject, projects(resolveField)

## Phase 3 — admin (system-admin)
- [x] **admin** — adminSettings, adminInstanceSettings, updateInstanceLicense, updateInstanceGeneralSettings, updateInstanceAuthenticationSettings, updateInstanceRequire2FA, adminUsers, adminCreateUser, updateUserSystemAdmin, updateUserDisabled, adminProjects, adminCreateProject, updateProjectUsesInstanceLicense, adminProjectMembers, adminAddProjectMember, adminChangeProjectMemberRole, adminTransferProjectOwnership, adminRemoveProjectMember

## Phase 4 — B-class (external deps, mocked)
- [x] **auth** — createMagicLink, resendMagicLink, resetUserPassword, resetUserPasswordByCode, setupSystemAdmin (error-path), signup, acceptInvite, login, logout
- [x] **two-factor** — startTwoFactorSetup, confirmTwoFactorSetup, startTwoFactorSetupWithChallenge, confirmTwoFactorSetupWithChallenge, verifyTwoFactor, disableTwoFactor, regenerateRecoveryCodes
- [x] **subscription** — createCheckoutSession (Stripe mocked), createPortalSession (Stripe mocked), getSubscriptionPlans, getSubscriptionByProjectId, getSubscriptionUsage
- [x] **integration** — listIntegrations, getIntegration, updateIntegration, getSalesforceAuthUrl, getSalesforceObjectFields (error-path), getIntegrationObjectMappings, getIntegrationObjectMapping, upsertIntegrationObjectMapping, updateIntegrationObjectMapping, deleteIntegrationObjectMapping, disconnectIntegration

## Running the suite
Use the canonical parallel command: `pnpm test:e2e -- test/e2e/gql` (17 suites /
292 tests). Do NOT use `--runInBand` for the whole gql dir — booting 17 full apps
in one process leaks redis/bullmq handles and a late afterAll can fail; the
parallel workers (separate processes) avoid this and also isolate admin's
per-file `IS_SELF_HOSTED_MODE` env toggle.

## Documented gaps
- **projects.updateProjectLicense** — happy-path not covered; a valid license is a
  JWT signed with the matching private key (scope `project`, matching projectId,
  non-expired). Error path (invalid license rejected, DB untouched) is covered.
- **utilities.queryOembedInfo** — real third-party embed fetch not asserted
  (network-flaky); no-provider-match and graceful-error paths are covered.
- **utilities.createPresignedUrl** — branches on env: with S3 configured the
  success shape is asserted; the guard-rejection branch is the gap (or vice-versa
  in a no-S3 env). The test is robust to both.
- **admin.updateInstanceLicense** — happy-path needs a signed instance license
  (same as projects). require2FA turn-on and last-system-admin guard not exercised
  (would pollute the shared instance singleton).
- **integration.getSalesforceObjectFields** — happy-path needs a live Salesforce
  OAuth session / mocked jsforce Connection; only the no-OAuth error is asserted.
- **subscription** — Stripe webhook handlers are service-level (not GraphQL ops),
  out of scope here.
- **auth.setupSystemAdmin** — happy-path mutates global instance state; only the
  SaaS-mode error path asserted. `logout` per-session cookie revocation needs
  cookie-parser (only in main.ts, not configureApp) — delegated revoke logic
  covered directly instead.
