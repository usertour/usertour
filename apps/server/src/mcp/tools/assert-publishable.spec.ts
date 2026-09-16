import { MemberCannotPublishToEnvironmentError } from '@/common/errors/errors';

import { McpToolContext } from '../mcp.types';
import { assertPublishable } from './assert-publishable';

/** Minimal ctx stub: the auth verdict, the owner's whitelist, the key's publishable subset, the env catalog. */
function ctxWith(opts: {
  refuse: Error | null;
  whitelist: string[] | undefined;
  publishable: string[] | null;
  envs: { id: string; name: string | null }[];
}): { ctx: McpToolContext; findMany: jest.Mock } {
  const findMany = jest.fn(async () => opts.envs);
  const ctx = {
    projectId: 'p1',
    token: { id: 't1', memberPublishEnvironmentIds: opts.whitelist },
    prisma: { environment: { findMany } },
    auth: {
      assertMayPublishTo: () => {
        if (opts.refuse) {
          throw opts.refuse;
        }
      },
      publishableEnvironmentIds: () => opts.publishable,
    },
  } as unknown as McpToolContext;
  return { ctx, findMany };
}

const refusal = () => new MemberCannotPublishToEnvironmentError();

describe('assertPublishable (MCP publish / unpublish)', () => {
  it('passes through when the owner may publish there', async () => {
    const { ctx, findMany } = ctxWith({
      refuse: null,
      whitelist: ['e1'],
      publishable: ['e1'],
      envs: [],
    });
    await expect(assertPublishable(ctx, 'e1')).resolves.toBeUndefined();
    expect(findMany).not.toHaveBeenCalled();
  });

  it('names the environments the key may publish to (whitelist ∩ key scope)', async () => {
    const { ctx, findMany } = ctxWith({
      refuse: refusal(),
      whitelist: ['e1', 'e2'],
      publishable: ['e1'],
      envs: [
        { id: 'e1', name: 'Staging' },
        { id: 'e2', name: 'Dev' },
      ],
    });
    const error = await assertPublishable(ctx, 'prod').catch((e) => e);
    expect(error).toBeInstanceOf(MemberCannotPublishToEnvironmentError);
    expect(error.messageDict.en).toContain('allows only: Staging (e1)');
    expect(error.messageDict.en).not.toContain('Dev (e2)');
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['e1', 'e2'] }, projectId: 'p1', deleted: false },
      }),
    );
  });

  it('says the KEY is out of scope when the whitelist is non-empty but unreachable', async () => {
    // The customer-facing shape: owner may publish to Dev + Production, the
    // OAuth key is scoped to a third environment. The whitelist is not empty
    // and the message must not claim it is.
    const { ctx } = ctxWith({
      refuse: refusal(),
      whitelist: ['dev', 'prod'],
      publishable: [],
      envs: [
        { id: 'dev', name: 'Dev' },
        { id: 'prod', name: 'Production' },
      ],
    });
    const error = await assertPublishable(ctx, 'eeeee').catch((e) => e);
    expect(error).toBeInstanceOf(MemberCannotPublishToEnvironmentError);
    expect(error.messageDict.en).toContain(
      'not scoped to any environment its owner may publish to',
    );
    expect(error.messageDict.en).toContain('Dev (dev), Production (prod)');
    expect(error.messageDict.en).not.toContain('empty');
  });

  it('says "any environment" only when the whitelist itself is empty, without querying', async () => {
    const { ctx, findMany } = ctxWith({
      refuse: refusal(),
      whitelist: [],
      publishable: [],
      envs: [],
    });
    const error = await assertPublishable(ctx, 'prod').catch((e) => e);
    expect(error).toBeInstanceOf(MemberCannotPublishToEnvironmentError);
    expect(error.messageDict.en).toContain('any environment');
    expect(findMany).not.toHaveBeenCalled();
  });

  it('lets any other error through untouched', async () => {
    const boom = new Error('unrelated');
    const { ctx } = ctxWith({ refuse: boom, whitelist: ['e1'], publishable: ['e1'], envs: [] });
    await expect(assertPublishable(ctx, 'e1')).rejects.toBe(boom);
  });
});
