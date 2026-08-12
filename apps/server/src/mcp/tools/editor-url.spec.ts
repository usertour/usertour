import { McpToolContext } from '../mcp.types';
import { editorUrlFor, withEditorUrl } from './editor-url';

/** Minimal ctx stub: dashboard config + env catalog + token scope. */
function ctxWith(
  dashboardUrl: string,
  envs: { id: string }[],
  allowed: string[] | null,
): McpToolContext {
  return {
    dashboardUrl,
    projectId: 'p1',
    prisma: { environment: { findMany: async () => envs } },
    auth: { allowedEnvironmentIds: () => allowed },
  } as unknown as McpToolContext;
}

describe('editorUrlFor', () => {
  it('composes the dashboard detail deep link from the explicit environment', async () => {
    const url = await editorUrlFor(
      ctxWith('https://app.example.com/', [], null),
      'flow',
      'c1',
      'env9',
    );
    // Trailing slash on the configured base must not double up in the path.
    expect(url).toBe('https://app.example.com/env/env9/flows/c1/detail');
  });

  it('is omitted (undefined) when the dashboard URL is not configured', async () => {
    expect(await editorUrlFor(ctxWith('', [{ id: 'e1' }], null), 'flow', 'c1')).toBeUndefined();
  });

  it('is omitted for a type with no dashboard page', async () => {
    expect(
      await editorUrlFor(ctxWith('https://app.example.com', [], null), 'nonsense', 'c1', 'e1'),
    ).toBeUndefined();
  });

  it('defaults to the oldest environment within the token scope', async () => {
    // Catalog is createdAt-asc; the oldest env (e1) is OUT of scope, so the link
    // must land on the oldest IN-scope one — never an environment the token
    // cannot see.
    const ctx = ctxWith(
      'https://app.example.com',
      [{ id: 'e1' }, { id: 'e2' }, { id: 'e3' }],
      ['e2', 'e3'],
    );
    expect(await editorUrlFor(ctx, 'checklist', 'c1')).toBe(
      'https://app.example.com/env/e2/checklists/c1/detail',
    );
  });

  it('is omitted when no environment is in scope', async () => {
    const ctx = ctxWith('https://app.example.com', [{ id: 'e1' }], []);
    expect(await editorUrlFor(ctx, 'flow', 'c1')).toBeUndefined();
  });
});

describe('withEditorUrl', () => {
  it('spreads the url onto the payload', () => {
    expect(withEditorUrl({ id: 'c1' }, 'u')).toEqual({ id: 'c1', editorUrl: 'u' });
  });

  it('omits the key entirely when there is no link', () => {
    expect(withEditorUrl({ id: 'c1' }, undefined)).toEqual({ id: 'c1' });
  });
});
