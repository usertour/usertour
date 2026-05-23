/* eslint-disable no-console */
/**
 * Seeds a self-contained fixture for the spot-check shell tool and prints the
 * `export SMOKE_*=...` lines on stdout so it can be `eval`'d:
 *
 *   eval "$(pnpm --silent smoke:spot-check-prep)"  # --silent: drop pnpm banner from stdout
 *   pnpm smoke:spot-check --queries-only
 *
 * What it seeds (against whatever DATABASE_URL points at — typically dev):
 *   - Project A `smoke-fixture-<tag>-A` with all 11 sub-resources
 *       + 3 members: OWNER, ADMIN, VIEWER
 *   - Project B `smoke-fixture-<tag>-B` with all 11 sub-resources
 *       + 1 member: OWNER (used as the ELSEWHERE token — owner of *another*
 *         project, NOT a member of A → real cross-project IDOR vector)
 *
 * Mints 4 JWTs via the app's JwtService config (JWT_SECRET from .env). Default
 * validity 2h; override via SMOKE_TOKEN_TTL.
 *
 * Status messages → stderr (won't pollute eval); exports → stdout.
 *
 * Run `pnpm smoke:spot-check-teardown` to delete every `smoke-fixture-*`
 * project the prep script may have left around.
 */
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const STATE_FILE = '/tmp/smoke-fixture-state.json';

import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';

import {
  createAccessToken,
  createAttribute,
  createBizCompany,
  createBizUser,
  createContent,
  createEnvironment,
  createEvent,
  createIntegration,
  createIntegrationObjectMapping,
  createInvite,
  createLocalization,
  createMembership,
  createProject,
  createSegment,
  createSession,
  createStep,
  createSubscription,
  createTheme,
  createUser,
  createVersion,
} from '../e2e/factories';

// ── tiny dotenv-with-${VAR}-expansion loader (no extra dep) ──────
function loadDotEnv(path: string) {
  if (!existsSync(path)) return;
  const collected: Record<string, string> = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
    collected[key] = value;
  }
  for (const key of Object.keys(collected)) {
    const expanded = collected[key].replace(
      /\$\{([A-Z_][A-Z0-9_]*)\}/gi,
      (_, name) => process.env[name] ?? collected[name] ?? '',
    );
    if (process.env[key] === undefined) {
      process.env[key] = expanded;
    }
  }
}
loadDotEnv(resolve(__dirname, '../../.env'));

const url = process.env.SMOKE_URL ?? 'http://localhost:3000/graphql';
const ttl = process.env.SMOKE_TOKEN_TTL ?? '2h';
const secret = process.env.JWT_SECRET;
if (!secret) {
  console.error('JWT_SECRET not set (looked in apps/server/.env and process env).');
  process.exit(2);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL not set (looked in apps/server/.env and process env).');
  process.exit(2);
}

const jwt = new JwtService({ secret });
const prisma = new PrismaClient();

const tag = `${Date.now()}`;
const fixtureName = (suffix: string) => `smoke-fixture-${tag}-${suffix}`;
const fixtureEmail = (role: string) => `smoke-fixture-${tag}-${role}@local`;

const log = (msg: string) => console.error(`[smoke-prep] ${msg}`);

async function seedProject(suffix: string, members: { role: string; email: string }[]) {
  const project = await createProject(prisma, { name: fixtureName(suffix) });
  // BUSINESS plan = unlimited env + team-member limit; lets the spot-check
  // exercise createEnvironments / inviteTeamMember happy paths instead of
  // bouncing on HOBBY's HOBBY limit (env=1, members=1) — those product
  // rules are the service layer's responsibility to spec, not smoke's.
  await createSubscription(prisma, project.id);
  const environment = await createEnvironment(prisma, project.id, { name: `env-${suffix}` });
  // Two extra envs so deleteEnvironments has per-role victims and never has
  // to fall back on the "last env" protection (E0022). One survives so the
  // last-env rule is still enforced for real production calls.
  const environmentForOwnerDelete = await createEnvironment(prisma, project.id, {
    name: `env-${suffix}-owner-victim`,
  });
  const environmentForAdminDelete = await createEnvironment(prisma, project.id, {
    name: `env-${suffix}-admin-victim`,
  });
  const content = await createContent(prisma, project.id, environment.id);
  const version = await createVersion(prisma, content.id);
  // `bizUser` is the protected one — used by createBizUserOnSegment /
  // deleteBizUserOnSegment and as the FK target for the protected session
  // (read-only). The two `bizUserForXDelete` rows are dedicated victims so
  // OWNER and ADMIN don't both target the same row in biz.deleteBizUser.
  const bizUser = await createBizUser(prisma, environment.id);
  const bizUserForOwnerDelete = await createBizUser(prisma, environment.id);
  const bizUserForAdminDelete = await createBizUser(prisma, environment.id);
  const bizCompany = await createBizCompany(prisma, environment.id);
  const bizCompanyForOwnerDelete = await createBizCompany(prisma, environment.id);
  const bizCompanyForAdminDelete = await createBizCompany(prisma, environment.id);
  // Session used by analytics.querySessionDetail (read). The four sessions
  // below cover the deleteSession / endSession × OWNER / ADMIN matrix so
  // every (op, role) call has its own row to consume.
  const session = await createSession(prisma, {
    bizUserId: bizUser.id,
    contentId: content.id,
    versionId: version.id,
  });
  const sessionForOwnerDelete = await createSession(prisma, {
    bizUserId: bizUser.id,
    contentId: content.id,
    versionId: version.id,
  });
  const sessionForAdminDelete = await createSession(prisma, {
    bizUserId: bizUser.id,
    contentId: content.id,
    versionId: version.id,
  });
  const sessionForOwnerEnd = await createSession(prisma, {
    bizUserId: bizUser.id,
    contentId: content.id,
    versionId: version.id,
  });
  const sessionForAdminEnd = await createSession(prisma, {
    bizUserId: bizUser.id,
    contentId: content.id,
    versionId: version.id,
  });
  // `theme` is what setDefaultTheme gets pointed at during the W block. The
  // two victims below are kept non-default so deleteTheme has a target it
  // can actually delete for each role.
  const theme = await createTheme(prisma, project.id);
  const themeForOwnerDelete = await createTheme(prisma, project.id);
  const themeForAdminDelete = await createTheme(prisma, project.id);
  // `attribute` stays for updateAttribute / listAttributes (non-destructive).
  // The two victims below let OWNER and ADMIN both exercise deleteAttribute.
  const attribute = await createAttribute(prisma, project.id);
  const attributeForOwnerDelete = await createAttribute(prisma, project.id);
  const attributeForAdminDelete = await createAttribute(prisma, project.id);
  const event = await createEvent(prisma, project.id);
  const eventForOwnerDelete = await createEvent(prisma, project.id);
  const eventForAdminDelete = await createEvent(prisma, project.id);
  // `localization` is what setDefaultLocalization gets pointed at during the
  // W block (which marks it as default). The two victims below are kept
  // non-default so deleteLocalization can succeed for OWNER and ADMIN
  // without hitting the "can't delete default" rule.
  const localization = await createLocalization(prisma, project.id);
  const localizationForOwnerDelete = await createLocalization(prisma, project.id);
  const localizationForAdminDelete = await createLocalization(prisma, project.id);
  // `segment` stays alive throughout the W block as the target for the four
  // OnSegment ops + updateSegment; the two victim segments below are what
  // OWNER and ADMIN each consume via biz.deleteSegment.
  const segment = await createSegment(prisma, project.id, environment.id);
  const segmentForOwnerDelete = await createSegment(prisma, project.id, environment.id);
  const segmentForAdminDelete = await createSegment(prisma, project.id, environment.id);
  const integration = await createIntegration(prisma, environment.id);
  const mapping = await createIntegrationObjectMapping(prisma, integration.id);
  const accessToken = await createAccessToken(prisma, environment.id);
  const step = await createStep(prisma, version.id);

  const users: Record<string, string> = {};
  for (const { role, email } of members) {
    const user = await createUser(prisma, { email });
    users[role] = user.id;
    await createMembership(prisma, user.id, project.id, role);
  }

  // Two removable VIEWERs: the first one is what team.removeTeamMember
  // targets (and consumes), the second is what changeTeamMemberRole acts
  // on afterwards. Without the split, changeTeamMemberRole would always
  // see "user already removed" (ParamsError).
  const removable = await createUser(prisma, { email: fixtureEmail(`${suffix}-removable`) });
  await createMembership(prisma, removable.id, project.id, 'VIEWER');
  const removableForChangeRole = await createUser(prisma, {
    email: fixtureEmail(`${suffix}-removable-changerole`),
  });
  await createMembership(prisma, removableForChangeRole.id, project.id, 'VIEWER');

  // A pending invite OWNER can cancel via team.cancelInvite.
  const invite = users.OWNER ? await createInvite(prisma, project.id, users.OWNER) : null;

  return {
    projectId: project.id,
    environmentId: environment.id,
    environmentForOwnerDelete: environmentForOwnerDelete.id,
    environmentForAdminDelete: environmentForAdminDelete.id,
    contentId: content.id,
    versionId: version.id,
    sessionId: session.id,
    sessionForOwnerDelete: sessionForOwnerDelete.id,
    sessionForAdminDelete: sessionForAdminDelete.id,
    sessionForOwnerEnd: sessionForOwnerEnd.id,
    sessionForAdminEnd: sessionForAdminEnd.id,
    themeId: theme.id,
    themeForOwnerDelete: themeForOwnerDelete.id,
    themeForAdminDelete: themeForAdminDelete.id,
    attributeId: attribute.id,
    attributeForOwnerDelete: attributeForOwnerDelete.id,
    attributeForAdminDelete: attributeForAdminDelete.id,
    eventId: event.id,
    eventForOwnerDelete: eventForOwnerDelete.id,
    eventForAdminDelete: eventForAdminDelete.id,
    localizationId: localization.id,
    localizationForOwnerDelete: localizationForOwnerDelete.id,
    localizationForAdminDelete: localizationForAdminDelete.id,
    segmentId: segment.id,
    segmentForOwnerDelete: segmentForOwnerDelete.id,
    segmentForAdminDelete: segmentForAdminDelete.id,
    integrationId: integration.id,
    mappingId: mapping.id,
    accessTokenId: accessToken.id,
    stepId: step.id,
    bizUserId: bizUser.id,
    bizUserForOwnerDelete: bizUserForOwnerDelete.id,
    bizUserForAdminDelete: bizUserForAdminDelete.id,
    bizCompanyId: bizCompany.id,
    bizCompanyForOwnerDelete: bizCompanyForOwnerDelete.id,
    bizCompanyForAdminDelete: bizCompanyForAdminDelete.id,
    removableUserId: removable.id,
    removableUserForChangeRole: removableForChangeRole.id,
    inviteId: invite?.id ?? '',
    users,
  };
}

(async () => {
  try {
    log(
      `seeding fixture tag=${tag} against ${process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@')}`,
    );
    const a = await seedProject('A', [
      { role: 'OWNER', email: fixtureEmail('A-OWNER') },
      { role: 'ADMIN', email: fixtureEmail('A-ADMIN') },
      { role: 'VIEWER', email: fixtureEmail('A-VIEWER') },
    ]);
    log(`  project A = ${a.projectId}`);
    const b = await seedProject('B', [{ role: 'OWNER', email: fixtureEmail('B-OWNER') }]);
    log(`  project B = ${b.projectId}`);

    const tokens = {
      OWNER: jwt.sign({ userId: a.users.OWNER }, { expiresIn: ttl }),
      ADMIN: jwt.sign({ userId: a.users.ADMIN }, { expiresIn: ttl }),
      VIEWER: jwt.sign({ userId: a.users.VIEWER }, { expiresIn: ttl }),
      ELSEWHERE: jwt.sign({ userId: b.users.OWNER }, { expiresIn: ttl }),
    };
    log(`  minted 4 tokens (ttl=${ttl})`);

    // Persist project ids so teardown can find them by id even if a mutation
    // renames the project mid-run (e.g. projects.updateProjectName makes the
    // name-prefix scan miss the row).
    appendFileSync(
      STATE_FILE,
      `${JSON.stringify({ tag, projectIds: [a.projectId, b.projectId] })}\n`,
    );
    log(`  recorded state at ${STATE_FILE}`);

    // exports → stdout (this is what gets eval'd)
    const lines = [
      `export SMOKE_URL=${url}`,
      `export SMOKE_PROJECT_ID=${a.projectId}`,
      `export SMOKE_ENVIRONMENT_ID=${a.environmentId}`,
      `export SMOKE_ENVIRONMENT_FOR_OWNER_DELETE_ID=${a.environmentForOwnerDelete}`,
      `export SMOKE_ENVIRONMENT_FOR_ADMIN_DELETE_ID=${a.environmentForAdminDelete}`,
      `export SMOKE_CONTENT_ID=${a.contentId}`,
      `export SMOKE_VERSION_ID=${a.versionId}`,
      `export SMOKE_SESSION_ID=${a.sessionId}`,
      `export SMOKE_SESSION_FOR_OWNER_DELETE_ID=${a.sessionForOwnerDelete}`,
      `export SMOKE_SESSION_FOR_ADMIN_DELETE_ID=${a.sessionForAdminDelete}`,
      `export SMOKE_SESSION_FOR_OWNER_END_ID=${a.sessionForOwnerEnd}`,
      `export SMOKE_SESSION_FOR_ADMIN_END_ID=${a.sessionForAdminEnd}`,
      `export SMOKE_THEME_ID=${a.themeId}`,
      `export SMOKE_THEME_FOR_OWNER_DELETE_ID=${a.themeForOwnerDelete}`,
      `export SMOKE_THEME_FOR_ADMIN_DELETE_ID=${a.themeForAdminDelete}`,
      `export SMOKE_ATTRIBUTE_ID=${a.attributeId}`,
      `export SMOKE_ATTRIBUTE_FOR_OWNER_DELETE_ID=${a.attributeForOwnerDelete}`,
      `export SMOKE_ATTRIBUTE_FOR_ADMIN_DELETE_ID=${a.attributeForAdminDelete}`,
      `export SMOKE_EVENT_ID=${a.eventId}`,
      `export SMOKE_EVENT_FOR_OWNER_DELETE_ID=${a.eventForOwnerDelete}`,
      `export SMOKE_EVENT_FOR_ADMIN_DELETE_ID=${a.eventForAdminDelete}`,
      `export SMOKE_LOCALIZATION_ID=${a.localizationId}`,
      `export SMOKE_LOCALIZATION_FOR_OWNER_DELETE_ID=${a.localizationForOwnerDelete}`,
      `export SMOKE_LOCALIZATION_FOR_ADMIN_DELETE_ID=${a.localizationForAdminDelete}`,
      `export SMOKE_SEGMENT_ID=${a.segmentId}`,
      `export SMOKE_SEGMENT_FOR_OWNER_DELETE_ID=${a.segmentForOwnerDelete}`,
      `export SMOKE_SEGMENT_FOR_ADMIN_DELETE_ID=${a.segmentForAdminDelete}`,
      `export SMOKE_INTEGRATION_ID=${a.integrationId}`,
      `export SMOKE_MAPPING_ID=${a.mappingId}`,
      `export SMOKE_ACCESS_TOKEN_ID=${a.accessTokenId}`,
      `export SMOKE_STEP_ID=${a.stepId}`,
      `export SMOKE_BIZ_USER_ID=${a.bizUserId}`,
      `export SMOKE_BIZ_USER_FOR_OWNER_DELETE_ID=${a.bizUserForOwnerDelete}`,
      `export SMOKE_BIZ_USER_FOR_ADMIN_DELETE_ID=${a.bizUserForAdminDelete}`,
      `export SMOKE_BIZ_COMPANY_ID=${a.bizCompanyId}`,
      `export SMOKE_BIZ_COMPANY_FOR_OWNER_DELETE_ID=${a.bizCompanyForOwnerDelete}`,
      `export SMOKE_BIZ_COMPANY_FOR_ADMIN_DELETE_ID=${a.bizCompanyForAdminDelete}`,
      `export SMOKE_REMOVABLE_USER_ID=${a.removableUserId}`,
      `export SMOKE_REMOVABLE_USER_FOR_CHANGE_ROLE_ID=${a.removableUserForChangeRole}`,
      `export SMOKE_INVITE_ID=${a.inviteId}`,
      `export SMOKE_B_PROJECT_ID=${b.projectId}`,
      `export SMOKE_B_ENVIRONMENT_ID=${b.environmentId}`,
      `export SMOKE_B_ENVIRONMENT_FOR_OWNER_DELETE_ID=${b.environmentForOwnerDelete}`,
      `export SMOKE_B_ENVIRONMENT_FOR_ADMIN_DELETE_ID=${b.environmentForAdminDelete}`,
      `export SMOKE_B_CONTENT_ID=${b.contentId}`,
      `export SMOKE_B_VERSION_ID=${b.versionId}`,
      `export SMOKE_B_SESSION_ID=${b.sessionId}`,
      `export SMOKE_B_SESSION_FOR_OWNER_DELETE_ID=${b.sessionForOwnerDelete}`,
      `export SMOKE_B_SESSION_FOR_ADMIN_DELETE_ID=${b.sessionForAdminDelete}`,
      `export SMOKE_B_SESSION_FOR_OWNER_END_ID=${b.sessionForOwnerEnd}`,
      `export SMOKE_B_SESSION_FOR_ADMIN_END_ID=${b.sessionForAdminEnd}`,
      `export SMOKE_B_THEME_ID=${b.themeId}`,
      `export SMOKE_B_THEME_FOR_OWNER_DELETE_ID=${b.themeForOwnerDelete}`,
      `export SMOKE_B_THEME_FOR_ADMIN_DELETE_ID=${b.themeForAdminDelete}`,
      `export SMOKE_B_ATTRIBUTE_ID=${b.attributeId}`,
      `export SMOKE_B_ATTRIBUTE_FOR_OWNER_DELETE_ID=${b.attributeForOwnerDelete}`,
      `export SMOKE_B_ATTRIBUTE_FOR_ADMIN_DELETE_ID=${b.attributeForAdminDelete}`,
      `export SMOKE_B_EVENT_ID=${b.eventId}`,
      `export SMOKE_B_EVENT_FOR_OWNER_DELETE_ID=${b.eventForOwnerDelete}`,
      `export SMOKE_B_EVENT_FOR_ADMIN_DELETE_ID=${b.eventForAdminDelete}`,
      `export SMOKE_B_LOCALIZATION_ID=${b.localizationId}`,
      `export SMOKE_B_LOCALIZATION_FOR_OWNER_DELETE_ID=${b.localizationForOwnerDelete}`,
      `export SMOKE_B_LOCALIZATION_FOR_ADMIN_DELETE_ID=${b.localizationForAdminDelete}`,
      `export SMOKE_B_SEGMENT_ID=${b.segmentId}`,
      `export SMOKE_B_SEGMENT_FOR_OWNER_DELETE_ID=${b.segmentForOwnerDelete}`,
      `export SMOKE_B_SEGMENT_FOR_ADMIN_DELETE_ID=${b.segmentForAdminDelete}`,
      `export SMOKE_B_INTEGRATION_ID=${b.integrationId}`,
      `export SMOKE_B_MAPPING_ID=${b.mappingId}`,
      `export SMOKE_B_ACCESS_TOKEN_ID=${b.accessTokenId}`,
      `export SMOKE_B_STEP_ID=${b.stepId}`,
      `export SMOKE_B_BIZ_USER_ID=${b.bizUserId}`,
      `export SMOKE_B_BIZ_USER_FOR_OWNER_DELETE_ID=${b.bizUserForOwnerDelete}`,
      `export SMOKE_B_BIZ_USER_FOR_ADMIN_DELETE_ID=${b.bizUserForAdminDelete}`,
      `export SMOKE_B_BIZ_COMPANY_ID=${b.bizCompanyId}`,
      `export SMOKE_B_BIZ_COMPANY_FOR_OWNER_DELETE_ID=${b.bizCompanyForOwnerDelete}`,
      `export SMOKE_B_BIZ_COMPANY_FOR_ADMIN_DELETE_ID=${b.bizCompanyForAdminDelete}`,
      `export SMOKE_B_REMOVABLE_USER_ID=${b.removableUserId}`,
      `export SMOKE_B_REMOVABLE_USER_FOR_CHANGE_ROLE_ID=${b.removableUserForChangeRole}`,
      `export SMOKE_B_INVITE_ID=${b.inviteId}`,
      `export SMOKE_TOKEN_OWNER=${tokens.OWNER}`,
      `export SMOKE_TOKEN_ADMIN=${tokens.ADMIN}`,
      `export SMOKE_TOKEN_VIEWER=${tokens.VIEWER}`,
      `export SMOKE_TOKEN_ELSEWHERE=${tokens.ELSEWHERE}`,
    ];
    process.stdout.write(`${lines.join('\n')}\n`);
    log('done. Now run:  pnpm smoke:spot-check --queries-only');
    log(
      'teardown later with:  pnpm smoke:spot-check-teardown   (cleans every smoke-fixture-* project)',
    );
  } catch (err) {
    console.error('[smoke-prep] failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
