import { resolveEnvironment } from './read-tools';

// Minimal env row shape resolveEnvironment cares about.
const env = (id: string, name: string, isPrimary = false) =>
  ({ id, name, isPrimary, projectId: 'p1', deleted: false }) as any;

const makeCtx = (envs: any[]) =>
  ({
    projectId: 'p1',
    auth: { resolveEnvironment: jest.fn(async (_p: string, id: string) => env(id, 'By Id')) },
    prisma: { environment: { findMany: jest.fn(async () => envs) } },
  }) as any;

describe('resolveEnvironment (multi-env safety)', () => {
  it('explicit environmentId → resolves via auth, regardless of ambiguity', async () => {
    const ctx = makeCtx([env('e1', 'Production', true), env('e2', 'Staging')]);
    await resolveEnvironment({ environmentId: 'e2' }, ctx, { requireExplicit: true });
    expect(ctx.auth.resolveEnvironment).toHaveBeenCalledWith('p1', 'e2');
  });

  it('single environment → defaults even in strict (write) mode', async () => {
    const ctx = makeCtx([env('e1', 'Production', true)]);
    const r = await resolveEnvironment({}, ctx, { requireExplicit: true });
    expect(r.id).toBe('e1');
  });

  it('multiple environments + strict + no id → throws and lists them (no silent pick)', async () => {
    const ctx = makeCtx([env('e1', 'Production', true), env('e2', 'Staging')]);
    await expect(resolveEnvironment({}, ctx, { requireExplicit: true })).rejects.toThrow(
      /Staging \(e2\)/,
    );
  });

  it('multiple environments + lenient (reads) + no id → defaults to the primary', async () => {
    const ctx = makeCtx([env('e2', 'Staging'), env('e1', 'Production', true)]);
    const r = await resolveEnvironment({}, ctx);
    expect(r.id).toBe('e1');
  });

  it('no environment at all → throws', async () => {
    const ctx = makeCtx([]);
    await expect(resolveEnvironment({}, ctx, { requireExplicit: true })).rejects.toThrow(
      /No environment found/,
    );
  });
});
