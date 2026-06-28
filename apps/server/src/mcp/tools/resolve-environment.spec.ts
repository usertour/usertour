import { ApiTokenAuthService } from '@/api-token/api-token-auth.service';
import { EnvironmentNotInTokenScopeError } from '@/common/errors';

import { resolveEnvironment } from './read-tools';

// Minimal env row shape resolveEnvironment cares about.
const env = (id: string, name: string, isPrimary = false) =>
  ({ id, name, isPrimary, projectId: 'p1', deleted: false }) as any;

// Real ApiTokenAuthService for the (pure) scope helpers; resolveEnvironment (explicit
// lookup) is stubbed against the in-memory env list.
const makeCtx = (envs: any[], allowedEnvironmentIds: string[] | null = null) => {
  const auth = new ApiTokenAuthService({} as any);
  jest.spyOn(auth, 'resolveEnvironment').mockImplementation(async (_p: string, id: string) => {
    const found = envs.find((e) => e.id === id);
    if (!found) throw new Error('env not found');
    return found;
  });
  return {
    projectId: 'p1',
    token: { allowedEnvironmentIds } as any,
    auth,
    prisma: { environment: { findMany: jest.fn(async () => envs) } },
  } as any;
};

describe('resolveEnvironment — multi-env safety (Q1) + token env scope', () => {
  // ---- back-compat: token with no env allowlist (null = all) ----
  it('explicit environmentId → resolves via auth, regardless of ambiguity', async () => {
    const ctx = makeCtx([env('e1', 'Production', true), env('e2', 'Staging')]);
    const r = await resolveEnvironment({ environmentId: 'e2' }, ctx, { requireExplicit: true });
    expect(r.id).toBe('e2');
    expect(ctx.auth.resolveEnvironment).toHaveBeenCalledWith('p1', 'e2');
  });

  it('single environment → defaults even in strict (write) mode', async () => {
    const ctx = makeCtx([env('e1', 'Production', true)]);
    expect((await resolveEnvironment({}, ctx, { requireExplicit: true })).id).toBe('e1');
  });

  it('multiple environments + strict + no id → throws and lists them (no silent pick)', async () => {
    const ctx = makeCtx([env('e1', 'Production', true), env('e2', 'Staging')]);
    await expect(resolveEnvironment({}, ctx, { requireExplicit: true })).rejects.toThrow(
      /Staging \(e2\)/,
    );
  });

  it('multiple environments + lenient (reads) + no id → defaults to the primary', async () => {
    const ctx = makeCtx([env('e2', 'Staging'), env('e1', 'Production', true)]);
    expect((await resolveEnvironment({}, ctx)).id).toBe('e1');
  });

  it('no environment at all → throws', async () => {
    const ctx = makeCtx([]);
    await expect(resolveEnvironment({}, ctx, { requireExplicit: true })).rejects.toThrow(
      /No environment/,
    );
  });

  // ---- token scoped to a subset of environments ----
  it('scoped to exactly one env → defaults to it (no explicit id needed, even for writes)', async () => {
    const ctx = makeCtx(
      [env('e1', 'Production', true), env('e2', 'Dev'), env('e3', 'Staging')],
      ['e2'],
    );
    expect((await resolveEnvironment({}, ctx, { requireExplicit: true })).id).toBe('e2');
  });

  it('scoped to multiple envs + strict + no id → requires explicit, lists only in-scope', async () => {
    const ctx = makeCtx(
      [env('e1', 'Production', true), env('e2', 'Dev'), env('e3', 'Staging')],
      ['e2', 'e3'],
    );
    const err = await resolveEnvironment({}, ctx, { requireExplicit: true }).catch((e) => e);
    expect(String(err.message)).toMatch(/Dev \(e2\)/);
    expect(String(err.message)).toMatch(/Staging \(e3\)/);
    expect(String(err.message)).not.toMatch(/Production/); // out-of-scope env not offered
  });

  it('explicit env outside the token scope → throws EnvironmentNotInTokenScopeError', async () => {
    const ctx = makeCtx([env('e1', 'Production', true), env('e2', 'Dev')], ['e2']);
    await expect(resolveEnvironment({ environmentId: 'e1' }, ctx)).rejects.toThrow(
      EnvironmentNotInTokenScopeError,
    );
  });

  it('scope lists an env not in the project → no usable env → throws', async () => {
    const ctx = makeCtx([env('e1', 'Production', true), env('e2', 'Dev')], ['e9']);
    await expect(resolveEnvironment({}, ctx)).rejects.toThrow(/No environment is available/);
  });
});
