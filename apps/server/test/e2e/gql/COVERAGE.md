# GraphQL functional e2e coverage

Tracks functional (behavior) e2e coverage of every GraphQL resolver operation.
Auth/permission is covered separately by `test/e2e/permission.e2e-spec.ts` — specs
here run as an authorized user and assert behavior + DB state.

Legend: `[x]` covered · `[ ]` pending · `[~]` documented gap (see note).

## Phase 0 — harness + template
- [x] **themes** — createTheme, updateTheme, setDefaultTheme, copyTheme, deleteTheme, getTheme, listThemes

## Phase 1 — A-class core
- [ ] **content** — createContent, updateContent, duplicateContent, getContent, createContentVersion, getContentVersion, updateContentVersion, restoreContentVersion, publishedContentVersion, unpublishedContentVersion, deleteContent, listContentVersions, addContentSteps, addContentStep, updateContentStep, findManyVersionLocations, updateVersionLocationData, queryContent
- [ ] **biz** — queryBizUser, queryBizCompany, queryBizUserEvents, queryBizCompanyEvents, createSegment, updateSegment, deleteSegment, listSegment, createBizUserOnSegment, deleteBizUserOnSegment, deleteBizUser, deleteBizCompany, createBizCompanyOnSegment, deleteBizCompanyOnSegment
- [ ] **environments** — createEnvironments, updateEnvironments, deleteEnvironments, userEnvironments, listAccessTokens, getAccessToken, createAccessToken, deleteAccessToken
- [ ] **attributes** — createAttribute, updateAttribute, deleteAttribute, listAttributes
- [ ] **events** — createEvent, updateEvent, deleteEvent, listEvents, listAttributeOnEvents
- [ ] **localizations** — createLocalization, updateLocalization, setDefaultLocalization, deleteLocalization, listLocalizations

## Phase 2 — A-class remaining
- [ ] **projects** — getProjectConfig, getProjectLicenseInfo, updateProjectName, updateProjectLicense
- [ ] **team** — getInvites, getTeamMembers, getInvite, inviteTeamMember, removeTeamMember, changeTeamMemberRole, cancelInvite, activeUserProject
- [ ] **analytics** — queryContentAnalytics, queryContentQuestionAnalytics, queryBizSession, deleteSession, endSession, querySessionDetail, listSessionsDetail, querySessionsByExternalId, queryTooltipTargetMissingSessions, queryTrackerUsers
- [ ] **utilities** — globalConfig, queryOembedInfo (network), createPresignedUrl (S3)
- [ ] **users** — me, updateUser, changePassword, changeEmail, createOwnedProject, projects(resolveField)

## Phase 3 — admin (system-admin)
- [ ] **admin** — adminSettings, adminInstanceSettings, updateInstanceLicense, updateInstanceGeneralSettings, updateInstanceAuthenticationSettings, updateInstanceRequire2FA, adminUsers, adminCreateUser, updateUserSystemAdmin, updateUserDisabled, adminProjects, adminCreateProject, updateProjectUsesInstanceLicense, adminProjectMembers, adminAddProjectMember, adminChangeProjectMemberRole, adminTransferProjectOwnership, adminRemoveProjectMember

## Phase 4 — B-class (external deps, mocked)
- [ ] **auth** — createMagicLink, resendMagicLink, resetUserPassword, resetUserPasswordByCode, setupSystemAdmin, signup, acceptInvite, login, logout
- [ ] **two-factor** — startTwoFactorSetup, confirmTwoFactorSetup, startTwoFactorSetupWithChallenge, confirmTwoFactorSetupWithChallenge, verifyTwoFactor, disableTwoFactor, regenerateRecoveryCodes
- [ ] **subscription** — createCheckoutSession (Stripe), createPortalSession (Stripe), getSubscriptionPlans, getSubscriptionByProjectId, getSubscriptionUsage
- [ ] **integration** — listIntegrations, getIntegration, updateIntegration, getSalesforceAuthUrl, getSalesforceObjectFields (jsforce), getIntegrationObjectMappings, getIntegrationObjectMapping, upsertIntegrationObjectMapping, updateIntegrationObjectMapping, deleteIntegrationObjectMapping, disconnectIntegration

## Documented gaps
_(none yet — list operations intentionally not covered, with reason)_
