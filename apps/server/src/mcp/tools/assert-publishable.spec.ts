import { MemberCannotPublishToEnvironmentError } from '@/common/errors/errors';

import { McpToolContext } from '../mcp.types';
import { assertPublishable } from './assert-publishable';

/** Minimal ctx stub: the auth verdict, the publishable ids, the env catalog. */
function ctxWith(opts: {
  refuse: Error | null;
  publishable: string[] | null;
  envs: { id: string; name: string | null }[];
}): { ctx: McpToolContext; findMany: jest.Mock } {
  const findMany = jest.fn(async () => opts.envs);
  const ctx = {
    projectId: 'p1',
    token: { id: 't1' },
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

describe('assertPublishable (MCP publish / unpublish)', () => {
  it('passes through when the owner may publish there', async () => {
    const { ctx, findMany } = ctxWith({ refuse: null, publishable: null, envs: [] });
    await expect(assertPublishable(ctx, 'e1')).resolves.toBeUndefined();
    expect(findMany).not.toHaveBeenCalled();
  });

  it('re-throws E1039 naming the environments the key may publish to', async () => {
    const { ctx, findMany } = ctxWith({
      refuse: new MemberCannotPublishToEnvironmentError(),
      publishable: ['e1', 'e2'],
      envs: [
        { id: 'e1', name: 'Staging' },
        { id: 'e2', name: null },
      ],
    });
    const error = await assertPublishable(ctx, 'prod').catch((e) => e);
    expect(error).toBeInstanceOf(MemberCannotPublishToEnvironmentError);
    expect(error.messageDict.en).toContain('Staging (e1)');
    expect(error.messageDict.en).toContain(' (e2)');
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['e1', 'e2'] }, projectId: 'p1', deleted: false },
      }),
    );
  });

  it('says "any environment" when the whitelist is empty, without querying', async () => {
    const { ctx, findMany } = ctxWith({
      refuse: new MemberCannotPublishToEnvironmentError(),
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
    const { ctx } = ctxWith({ refuse: boom, publishable: ['e1'], envs: [] });
    await expect(assertPublishable(ctx, 'e1')).rejects.toBe(boom);
  });
});
