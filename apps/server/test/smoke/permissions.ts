/**
 * Smoke-test every role-gated GraphQL endpoint against any running environment
 * (local dev, staging, …) and report whether the permission gate matches what
 * the contract expects.
 *
 * Shares its source of truth with the e2e contract: the 93-endpoint table in
 * `../e2e/endpoints.ts`. Same tiers, same scope shapes — only the target
 * (URL + tokens + real resource ids) differs. Inputs come exclusively from
 * environment variables, so no secrets live in the repo.
 *
 * What it fires (matches the e2e's safe-direction strategy):
 *   - DENY direction for every endpoint × every role that must not reach it
 *     (the guard throws before the resolver; zero side effects, even for
 *     mutations).
 *   - ALLOW direction for queries only (read-only; mutation allow would
 *     create/delete/publish/email, so it's intentionally not fired).
 *   - `denyOnly` endpoints skip allow even for queries (Salesforce externals).
 *
 * Required environment variables:
 *   SMOKE_URL                   GraphQL endpoint, e.g. http://localhost:3000/graphql
 *   SMOKE_PROJECT_ID            real ids in the target environment:
 *   SMOKE_ENVIRONMENT_ID
 *   SMOKE_CONTENT_ID
 *   SMOKE_VERSION_ID
 *   SMOKE_SESSION_ID
 *   SMOKE_THEME_ID
 *   SMOKE_ATTRIBUTE_ID
 *   SMOKE_EVENT_ID
 *   SMOKE_LOCALIZATION_ID
 *   SMOKE_SEGMENT_ID
 *   SMOKE_INTEGRATION_ID
 *   SMOKE_MAPPING_ID            integration object mapping id (3 endpoints use it)
 *
 * Optional token environment variables (at least one required) — each enables
 * the checks for its role and is skipped when unset, so partial scenarios are
 * cheap to run without preparing every role:
 *   SMOKE_TOKEN_OWNER           JWT for an OWNER of the target project
 *   SMOKE_TOKEN_ADMIN           JWT for an ADMIN
 *   SMOKE_TOKEN_VIEWER          JWT for a VIEWER
 *   SMOKE_TOKEN_NONE            JWT for a user with no memberships anywhere
 *   SMOKE_TOKEN_ELSEWHERE       JWT for a user who is OWNER of a *different*
 *                               project (cross-project IDOR vector)
 *
 * Common scenarios:
 *   - In-project sweep: set OWNER/ADMIN/VIEWER/NONE → ~218 checks against
 *     the target project's tiers and the basic non-member shape.
 *   - Cross-project IDOR: set only ELSEWHERE (token of any OWNER of another
 *     project) → 93 deny checks proving the foreigner can't reach the target.
 *   - Both groups together → ~311 checks in one run.
 *
 * Modes:
 *   pnpm smoke:permissions            execute against SMOKE_URL, print summary
 *   pnpm smoke:permissions -- --curl  print one curl command per check; do not execute
 *
 * Exit code: 0 if every executed check matches the contract, 1 otherwise.
 * Skipped checks (no token for that role) don't affect the exit code; they're
 * counted separately in the summary.
 */
import {
  ALLOW_ROLE,
  DENY_ROLES,
  ENDPOINTS,
  type Endpoint,
  type Role,
  type Seed,
} from '../e2e/endpoints';

type Outcome = 'E0013' | 'OTHER_ERROR' | 'OK';

const REQUIRED_ENV = [
  'SMOKE_URL',
  'SMOKE_PROJECT_ID',
  'SMOKE_ENVIRONMENT_ID',
  'SMOKE_CONTENT_ID',
  'SMOKE_VERSION_ID',
  'SMOKE_SESSION_ID',
  'SMOKE_THEME_ID',
  'SMOKE_ATTRIBUTE_ID',
  'SMOKE_EVENT_ID',
  'SMOKE_LOCALIZATION_ID',
  'SMOKE_SEGMENT_ID',
  'SMOKE_INTEGRATION_ID',
  'SMOKE_MAPPING_ID',
] as const;

const TOKEN_ENV: Record<Role, string> = {
  OWNER: 'SMOKE_TOKEN_OWNER',
  ADMIN: 'SMOKE_TOKEN_ADMIN',
  VIEWER: 'SMOKE_TOKEN_VIEWER',
  NONE: 'SMOKE_TOKEN_NONE',
  ELSEWHERE: 'SMOKE_TOKEN_ELSEWHERE',
};

const missing = REQUIRED_ENV.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error('Missing required environment variables:');
  for (const name of missing) {
    console.error(`  ${name}`);
  }
  console.error('\nSet these (see file header for what each one means) and try again.');
  process.exit(2);
}

const url = process.env.SMOKE_URL as string;
const token: Partial<Record<Role, string>> = {};
for (const [role, envName] of Object.entries(TOKEN_ENV) as [Role, string][]) {
  const value = process.env[envName];
  if (value) {
    token[role] = value;
  }
}
if (Object.keys(token).length === 0) {
  console.error('No SMOKE_TOKEN_* set — at least one role token is required.');
  console.error(`Set any of: ${Object.values(TOKEN_ENV).join(', ')}`);
  process.exit(2);
}
const seed: Seed = {
  projectId: process.env.SMOKE_PROJECT_ID as string,
  environmentId: process.env.SMOKE_ENVIRONMENT_ID as string,
  contentId: process.env.SMOKE_CONTENT_ID as string,
  versionId: process.env.SMOKE_VERSION_ID as string,
  sessionId: process.env.SMOKE_SESSION_ID as string,
  themeId: process.env.SMOKE_THEME_ID as string,
  attributeId: process.env.SMOKE_ATTRIBUTE_ID as string,
  eventId: process.env.SMOKE_EVENT_ID as string,
  localizationId: process.env.SMOKE_LOCALIZATION_ID as string,
  segmentId: process.env.SMOKE_SEGMENT_ID as string,
  integrationId: process.env.SMOKE_INTEGRATION_ID as string,
  mappingId: process.env.SMOKE_MAPPING_ID as string,
};

const printCurlOnly = process.argv.includes('--curl');

const classify = (errors: unknown[] | undefined): Outcome => {
  if (!errors || errors.length === 0) {
    return 'OK';
  }
  const isPermissionError = errors.some(
    (e) => (e as { extensions?: { code?: string } })?.extensions?.code === 'E0013',
  );
  return isPermissionError ? 'E0013' : 'OTHER_ERROR';
};

const buildBody = (ep: Endpoint) => ({ query: ep.doc, variables: ep.vars(seed) });

const printCurl = (ep: Endpoint, role: Role, bearer: string) => {
  const body = JSON.stringify(buildBody(ep));
  // single-quote the body for shell safety; embedded single quotes are unlikely
  // but escape just in case.
  const safeBody = body.replace(/'/g, `'\\''`);
  console.log(`# ${ep.key} as ${role}`);
  console.log(
    `curl -sS -X POST '${url}' \\\n  -H 'Content-Type: application/json' \\\n  -H 'Authorization: Bearer ${bearer}' \\\n  -d '${safeBody}'`,
  );
  console.log();
};

const fire = async (
  ep: Endpoint,
  role: Role,
  bearer: string,
): Promise<Outcome | 'NETWORK_ERROR'> => {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bearer}`,
      },
      body: JSON.stringify(buildBody(ep)),
    });
    const json = (await res.json()) as { errors?: unknown[] };
    return classify(json.errors);
  } catch (err) {
    console.error(`network error firing ${ep.key} as ${role}: ${(err as Error).message}`);
    return 'NETWORK_ERROR';
  }
};

interface Check {
  endpoint: string;
  role: Role;
  expected: 'E0013' | 'not-E0013';
  actual: Outcome | 'NETWORK_ERROR';
  ok: boolean;
}

interface PlannedCheck {
  ep: Endpoint;
  role: Role;
  expected: 'E0013' | 'not-E0013';
}

const plan = (): { runnable: PlannedCheck[]; skippedRoles: Set<Role> } => {
  const runnable: PlannedCheck[] = [];
  const skippedRoles = new Set<Role>();
  for (const ep of ENDPOINTS) {
    for (const role of DENY_ROLES[ep.tier]) {
      if (token[role]) {
        runnable.push({ ep, role, expected: 'E0013' });
      } else {
        skippedRoles.add(role);
      }
    }
    if (ep.op === 'query' && !ep.denyOnly) {
      const role = ALLOW_ROLE[ep.tier];
      if (token[role]) {
        runnable.push({ ep, role, expected: 'not-E0013' });
      } else {
        skippedRoles.add(role);
      }
    }
  }
  return { runnable, skippedRoles };
};

(async () => {
  const { runnable, skippedRoles } = plan();
  const exercisedRoles = Object.keys(token) as Role[];

  if (printCurlOnly) {
    for (const { ep, role } of runnable) {
      printCurl(ep, role, token[role] as string);
    }
    return;
  }

  console.log(
    `Smoking ${runnable.length} permission checks against ${url} ` +
      `(roles: ${exercisedRoles.join(', ')})…\n`,
  );
  const checks: Check[] = [];
  for (const { ep, role, expected } of runnable) {
    const actual = await fire(ep, role, token[role] as string);
    const ok = expected === 'E0013' ? actual === 'E0013' : actual !== 'E0013';
    checks.push({ endpoint: ep.key, role, expected, actual, ok });
  }

  const mismatches = checks.filter((c) => !c.ok);
  console.log(
    `Total: ${checks.length}  OK: ${checks.length - mismatches.length}  Mismatch: ${mismatches.length}`,
  );
  if (skippedRoles.size > 0) {
    console.log(`Skipped roles (no token provided): ${[...skippedRoles].join(', ')}`);
  }
  if (mismatches.length > 0) {
    console.log('\nMismatches:');
    for (const m of mismatches) {
      console.log(`  ${m.endpoint} as ${m.role}: expected ${m.expected}, got ${m.actual}`);
    }
  }
  process.exit(mismatches.length === 0 ? 0 : 1);
})();
