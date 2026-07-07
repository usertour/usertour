import { Prisma } from '@prisma/client';
import type { PrismaService } from 'nestjs-prisma';

import { ParamsError } from '@/common/errors';

import { ApiTokenService } from './api-token.service';

/**
 * Personal API keys (`utp_`) and OAuth-issued access tokens (`uto_`) share the
 * `ApiToken` table, discriminated by `clientId` (null = personal, set = OAuth).
 * The personal-key surface must touch ONLY personal rows: OAuth tokens are
 * managed via "Connected apps" (revokeGrant), and rotating/deleting them here
 * would silently break or false-revoke the connection. These tests pin that
 * `clientId: null` constraint on list / update / rotate / delete.
 */

type Row = {
  id: string;
  userId: string;
  clientId: string | null;
  name: string;
  hashedSecret?: string;
  partialKey?: string;
};

// Minimal in-memory ApiToken store that honors the simple equality `where`
// clauses the service builds (incl. `clientId: null` meaning "is null"), so the
// tests assert real behavior rather than just which args were passed.
const makeFakePrisma = (rows: Row[]) => {
  const matches = (row: Row, where: Record<string, unknown>) =>
    Object.entries(where).every(([k, v]) =>
      v === null
        ? (row as Record<string, unknown>)[k] == null
        : (row as Record<string, unknown>)[k] === v,
    );

  return {
    apiToken: {
      findMany: async ({ where }: { where: Record<string, unknown> }) =>
        rows.filter((r) => matches(r, where)).map((r) => ({ ...r, projects: [] })),
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        const r = rows.find((row) => matches(row, where));
        return r ? { id: r.id } : null;
      },
      deleteMany: async ({ where }: { where: Record<string, unknown> }) => {
        const keep = rows.filter((r) => !matches(r, where));
        const count = rows.length - keep.length;
        rows.splice(0, rows.length, ...keep);
        return { count };
      },
      update: async ({ where, data }: { where: { id: string }; data: Partial<Row> }) => {
        const r = rows.find((row) => row.id === where.id);
        if (!r) throw new Error('not found');
        Object.assign(r, data);
        return { ...r, projects: [] };
      },
    },
    // validateProjects checks the caller belongs to each target project.
    userOnProject: { findFirst: async () => ({ id: 'membership' }) },
  } as unknown as PrismaService;
};

const personal = (over: Partial<Row> = {}): Row => ({
  id: 'p1',
  userId: 'u1',
  clientId: null,
  name: 'personal',
  ...over,
});
const oauth = (over: Partial<Row> = {}): Row => ({
  id: 'o1',
  userId: 'u1',
  clientId: 'client-x',
  name: 'oauth',
  ...over,
});

describe('ApiTokenService — personal/OAuth separation', () => {
  it('listTokens excludes OAuth-issued tokens', async () => {
    const service = new ApiTokenService(makeFakePrisma([personal(), oauth()]));

    const result = await service.listTokens('u1');

    expect(result.map((t) => t.id)).toEqual(['p1']);
  });

  it('deleteToken removes a personal token but not an OAuth token', async () => {
    const rows = [personal(), oauth()];
    const service = new ApiTokenService(makeFakePrisma(rows));

    await expect(service.deleteToken('u1', 'o1')).resolves.toBe(false); // OAuth: no-op
    expect(rows.map((r) => r.id)).toEqual(['p1', 'o1']); // OAuth row survives

    await expect(service.deleteToken('u1', 'p1')).resolves.toBe(true); // personal: deleted
    expect(rows.map((r) => r.id)).toEqual(['o1']);
  });

  it('updateToken rejects an OAuth token (not found)', async () => {
    const service = new ApiTokenService(makeFakePrisma([personal(), oauth()]));

    await expect(service.updateToken('u1', 'o1', { name: 'hacked' })).rejects.toBeInstanceOf(
      ParamsError,
    );
  });

  it('rotateToken rejects an OAuth token (not found)', async () => {
    const service = new ApiTokenService(makeFakePrisma([personal(), oauth()]));

    await expect(service.rotateToken('u1', 'o1')).rejects.toBeInstanceOf(ParamsError);
  });

  it('still allows update/rotate on the owner’s personal token', async () => {
    const service = new ApiTokenService(makeFakePrisma([personal(), oauth()]));

    await expect(service.updateToken('u1', 'p1', { name: 'renamed' })).resolves.toMatchObject({
      id: 'p1',
      name: 'renamed',
    });
    await expect(service.rotateToken('u1', 'p1')).resolves.toHaveProperty('plaintext');
  });

  // Changing a token's project without a new environment list must clear the old
  // env allowlist — env ids never span projects, so a stale allowlist would brick
  // every env-scoped call under the new project (EnvironmentNotInTokenScopeError).
  it('clears the env allowlist when the project changes without a new env list', async () => {
    const rows = [personal({ allowedEnvironmentIds: ['old-project-env'] } as never)];
    const service = new ApiTokenService(makeFakePrisma(rows));
    const res = (await service.updateToken('u1', 'p1', { projectIds: ['projB'] })) as {
      allowedEnvironmentIds: unknown;
    };
    expect(res.allowedEnvironmentIds).toBe(Prisma.DbNull);
  });

  it('leaves the env allowlist untouched on a name-only update', async () => {
    const rows = [personal({ allowedEnvironmentIds: ['e1'] } as never)];
    const service = new ApiTokenService(makeFakePrisma(rows));
    const res = (await service.updateToken('u1', 'p1', { name: 'renamed' })) as {
      allowedEnvironmentIds: unknown;
    };
    expect(res.allowedEnvironmentIds).toEqual(['e1']);
  });
});
