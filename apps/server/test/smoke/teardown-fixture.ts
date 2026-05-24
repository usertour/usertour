/* eslint-disable no-console */
/**
 * Deletes every project the prep script created (and its full subtree of
 * environments / contents / versions / sessions / themes / attributes /
 * events / localizations / segments / integrations / mappings + the users
 * the prep created).
 *
 * Sources, in order:
 *   1. `/tmp/smoke-fixture-state.json` — recorded project ids from prep.
 *      Robust against `projects.updateProjectName` renaming a project mid-run.
 *   2. Fallback: `smoke-fixture-*` name prefix (or whatever you pass as arg)
 *      — useful if the state file was wiped or for cleaning leftovers.
 *
 * Run:
 *   pnpm smoke:spot-check-teardown                     # default
 *   pnpm smoke:spot-check-teardown smoke-fixture-1234  # name-prefix scan only
 *
 * Safe to run multiple times; idempotent.
 */
import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';

import { PrismaClient } from '@prisma/client';

const STATE_FILE = '/tmp/smoke-fixture-state.json';

function loadDotEnv(path: string) {
  if (!existsSync(path)) return;
  const collected: Record<string, string> = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    collected[key] = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
  }
  for (const key of Object.keys(collected)) {
    const expanded = collected[key].replace(
      /\$\{([A-Z_][A-Z0-9_]*)\}/gi,
      (_, name) => process.env[name] ?? collected[name] ?? '',
    );
    if (process.env[key] === undefined) process.env[key] = expanded;
  }
}
loadDotEnv(resolve(__dirname, '../../.env'));

const prisma = new PrismaClient();
const log = (msg: string) => console.error(`[smoke-teardown] ${msg}`);

async function deleteProject(projectId: string, name: string) {
  // FK-safe order, same as permission.e2e-spec.ts afterAll.
  const envIds = (
    await prisma.environment.findMany({ where: { projectId }, select: { id: true } })
  ).map((e) => e.id);
  const contentIds = (
    await prisma.content.findMany({ where: { projectId }, select: { id: true } })
  ).map((c) => c.id);
  const versionIds = (
    await prisma.version.findMany({
      where: { contentId: { in: contentIds } },
      select: { id: true },
    })
  ).map((v) => v.id);
  const memberships = await prisma.userOnProject.findMany({
    where: { projectId },
    select: { userId: true },
  });
  const userIds = memberships.map((m) => m.userId);

  const segmentIds = (
    await prisma.segment.findMany({ where: { projectId }, select: { id: true } })
  ).map((s) => s.id);
  // FK-safe order. Models that have child rows referencing them get cleared
  // first; the order matches what every spot-check mutation can leave behind.
  await prisma.attributeOnEvent.deleteMany({
    where: { event: { projectId } },
  });
  await prisma.bizEvent.deleteMany({ where: { bizUser: { environmentId: { in: envIds } } } });
  await prisma.invite.deleteMany({ where: { projectId } });
  await prisma.accessToken.deleteMany({ where: { environmentId: { in: envIds } } });
  await prisma.integrationObjectMapping.deleteMany({
    where: { integration: { environmentId: { in: envIds } } },
  });
  await prisma.integration.deleteMany({ where: { environmentId: { in: envIds } } });
  await prisma.bizSession.deleteMany({ where: { contentId: { in: contentIds } } });
  await prisma.bizUserOnSegment.deleteMany({ where: { segmentId: { in: segmentIds } } });
  await prisma.bizCompanyOnSegment.deleteMany({ where: { segmentId: { in: segmentIds } } });
  await prisma.bizUserOnCompany.deleteMany({
    where: { bizUser: { environmentId: { in: envIds } } },
  });
  await prisma.bizCompany.deleteMany({ where: { environmentId: { in: envIds } } });
  await prisma.bizUser.deleteMany({ where: { environmentId: { in: envIds } } });
  await prisma.step.deleteMany({ where: { versionId: { in: versionIds } } });
  await prisma.versionOnLocalization.deleteMany({ where: { versionId: { in: versionIds } } });
  await prisma.contentOnEnvironment.deleteMany({ where: { contentId: { in: contentIds } } });
  await prisma.version.deleteMany({ where: { contentId: { in: contentIds } } });
  await prisma.content.deleteMany({ where: { projectId } });
  await prisma.segment.deleteMany({ where: { projectId } });
  await prisma.localization.deleteMany({ where: { projectId } });
  await prisma.event.deleteMany({ where: { projectId } });
  await prisma.theme.deleteMany({ where: { projectId } });
  await prisma.attribute.deleteMany({ where: { projectId } });
  await prisma.environment.deleteMany({ where: { projectId } });
  await prisma.userOnProject.deleteMany({ where: { projectId } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  // Project.subscriptionId is the Stripe id, not a Subscription PK; clear
  // the FK-shaped column on the project first, then drop the subscription
  // row(s) by projectId so Project.delete is unblocked.
  await prisma.project.update({ where: { id: projectId }, data: { subscriptionId: null } });
  await prisma.subscription.deleteMany({ where: { projectId } });
  await prisma.project.delete({ where: { id: projectId } });
  log(`deleted ${name}`);
}

function readState(): string[] {
  if (!existsSync(STATE_FILE)) return [];
  const ids: string[] = [];
  for (const line of readFileSync(STATE_FILE, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      const { projectIds } = JSON.parse(line) as { projectIds?: string[] };
      if (Array.isArray(projectIds)) ids.push(...projectIds);
    } catch {
      // ignore malformed lines
    }
  }
  return ids;
}

(async () => {
  try {
    const arg = process.argv[2];
    const targets = new Map<string, string>(); // id → name

    if (arg) {
      // explicit name-prefix scan
      const found = await prisma.project.findMany({
        where: { name: { startsWith: arg } },
        select: { id: true, name: true },
      });
      for (const p of found) targets.set(p.id, p.name);
      log(`name-prefix "${arg}*" matched ${found.length} project(s)`);
    } else {
      // default: state file + name-prefix fallback merged
      const ids = readState();
      if (ids.length > 0) {
        const fromState = await prisma.project.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true },
        });
        for (const p of fromState) targets.set(p.id, p.name);
        log(`state file recorded ${ids.length} id(s); ${fromState.length} still exist`);
      }
      const leftover = await prisma.project.findMany({
        where: { name: { startsWith: 'smoke-fixture-' } },
        select: { id: true, name: true },
      });
      const added = leftover.filter((p) => !targets.has(p.id));
      for (const p of added) targets.set(p.id, p.name);
      if (added.length > 0) log(`fallback name scan found ${added.length} extra leftover(s)`);
    }

    if (targets.size === 0) {
      log('nothing to delete');
    } else {
      log(`deleting ${targets.size} project(s)`);
      for (const [id, name] of targets) await deleteProject(id, name);
    }

    // Sweep stranded smoke-fixture users — `deleteProject` only catches
    // users with a live UserOnProject row at teardown time, so any user
    // whose membership got consumed during the spot-check (most commonly
    // by team.removeTeamMember on the removable VIEWERs) is left orphaned.
    // Match on the `smoke-fixture-` email prefix that prep stamps, and
    // require zero remaining memberships so we never delete users from
    // real projects who happen to share the prefix.
    const stranded = await prisma.user.deleteMany({
      where: {
        email: { startsWith: 'smoke-fixture-' },
        projects: { none: {} },
      },
    });
    if (stranded.count > 0) {
      log(`swept ${stranded.count} stranded smoke-fixture user(s)`);
    }

    // Clear state file unless caller specified a custom name-prefix scan
    if (!arg && existsSync(STATE_FILE)) unlinkSync(STATE_FILE);

    log('done');
  } catch (err) {
    console.error('[smoke-teardown] failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
