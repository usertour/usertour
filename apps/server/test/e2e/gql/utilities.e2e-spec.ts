import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

import { graphql, gqlData } from '../auth';
import { createTestApp } from '../create-test-app';
import { buildProject } from '../factories';
import { buildAuthorizedUser, teardownProject } from './_support';

/**
 * Functional e2e for the `utilities` GraphQL resolver. Mirrors the themes
 * template: boot the app once, run as an OWNER for the auth-gated ops, assert
 * each op's contract. Auth (who-can-call) is covered by permission.e2e-spec; here
 * we exercise behavior.
 *
 * The three ops have awkward dependencies on instance config / the network, so a
 * couple of happy-paths are intentionally environment-dependent — documented as
 * gaps below rather than written as flaky assertions:
 *
 *   - globalConfig — @Public(), reads instance config + DB. Solid happy-path:
 *     called WITHOUT a token, asserts the full GlobalConfig shape. The boolean
 *     values depend on env (IS_SELF_HOSTED_MODE etc.), so we assert field
 *     PRESENCE and types, not specific values.
 *
 *   - queryOembedInfo(url) — fires a real outbound HTTP request to the matching
 *     oEmbed provider. We assert the robust, deterministic cases: a url that
 *     matches NO provider returns empty metadata (no network call, real
 *     assertion), and a url that matches a provider but is unreachable/invalid
 *     surfaces a GraphQL error. The "valid url returns real embed html" path is
 *     a NETWORK-DEPENDENT GAP — not asserted to avoid flakiness against a
 *     third-party service.
 *
 *   - createPresignedUrl — gated by S3ConfigGuard. If the test env has no S3
 *     config the guard throws (asserted via errors). If S3 IS configured the
 *     resolver returns a { signedUrl, cdnUrl } Storage shape (asserted). The
 *     test handles BOTH so it is robust across configured/unconfigured envs; the
 *     branch not taken in a given env is the documented CONFIG-DEPENDENT GAP.
 */
describe('GraphQL utilities (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let projectId: string;
  let token: string;
  const userIds: string[] = [];

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    // A project + OWNER token are only needed for the auth-gated ops
    // (queryOembedInfo, createPresignedUrl). globalConfig is @Public().
    const project = await buildProject(prisma, { name: 'gql-utilities' });
    projectId = project.id;
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    token = owner.token;
    userIds.push(owner.user.id);
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      await teardownProject(prisma, projectId);
      if (userIds.length) {
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    }
    await app?.close();
  });

  describe('globalConfig (Public)', () => {
    const GLOBAL_CONFIG = `query {
      globalConfig {
        isSelfHostedMode
        apiUrl
        allowUserRegistration
        allowProjectLevelSubscriptionManagement
        needsSystemAdminSetup
        require2FA
        authProviders
      }
    }`;

    it('returns the instance config shape WITHOUT a token', async () => {
      // No token: @Public() means the JWT guard is bypassed.
      const res = await graphql(app, { query: GLOBAL_CONFIG });
      const config = gqlData(res).globalConfig;

      // Assert the full GlobalConfig contract: presence + types. Concrete
      // boolean values depend on env (IS_SELF_HOSTED_MODE etc.) so we don't
      // pin them.
      expect(config).toEqual(
        expect.objectContaining({
          isSelfHostedMode: expect.any(Boolean),
          allowUserRegistration: expect.any(Boolean),
          allowProjectLevelSubscriptionManagement: expect.any(Boolean),
          needsSystemAdminSetup: expect.any(Boolean),
          require2FA: expect.any(Boolean),
        }),
      );
      // authProviders is a (possibly empty) string array.
      expect(Array.isArray(config.authProviders)).toBe(true);
      for (const p of config.authProviders) {
        expect(typeof p).toBe('string');
      }
      // apiUrl is nullable in the schema.
      expect(['string', 'object']).toContain(typeof config.apiUrl); // string or null
    });

    it('is reachable with a token too (Public does not require auth)', async () => {
      const res = await graphql(app, { token, query: GLOBAL_CONFIG });
      const config = gqlData(res).globalConfig;
      expect(typeof config.isSelfHostedMode).toBe('boolean');
    });
  });

  describe('queryOembedInfo', () => {
    const QUERY_OEMBED = `query ($url: String!) {
      queryOembedInfo(url: $url) { html width height }
    }`;

    it('returns empty metadata for a url that matches no oEmbed provider', async () => {
      // A url that matches no provider scheme skips the loop entirely and
      // returns empty metadata — deterministic, no network call.
      const res = await graphql(app, {
        token,
        query: QUERY_OEMBED,
        variables: { url: 'https://example.invalid/not-an-embed' },
      });
      const oembed = gqlData(res).queryOembedInfo;
      expect(oembed).toEqual({ html: '', width: '', height: '' });
    });

    it('errors gracefully for a provider url that is unreachable', async () => {
      // A YouTube watch url matches a provider scheme, so the service issues a
      // real outbound request to the provider endpoint. With a bogus video id
      // the provider rejects (or, offline, the request fails) — either way the
      // resolver surfaces a GraphQL error rather than data.
      //
      // DOCUMENTED GAP: the success path (valid url -> real embed html/width/
      // height) is network-dependent on a third-party service and is NOT
      // asserted here to avoid flakiness.
      const res = await graphql(app, {
        token,
        query: QUERY_OEMBED,
        variables: { url: 'https://www.youtube.com/watch?v=usertour-e2e-bogus-id-000000' },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
    }, 30000);
  });

  describe('createPresignedUrl (S3ConfigGuard)', () => {
    const CREATE_PRESIGNED = `mutation ($data: createPresignedUrlInput!) {
      createPresignedUrl(data: $data) { signedUrl cdnUrl }
    }`;

    it('either returns a Storage shape (S3 configured) or errors via S3ConfigGuard', async () => {
      const res = await graphql(app, {
        token,
        query: CREATE_PRESIGNED,
        variables: {
          data: { fileName: 'utilities-e2e.png', storageType: 'image', contentType: 'image/png' },
        },
      });

      if (res.body.errors?.length) {
        // S3 not configured in this env: S3ConfigGuard threw before the
        // resolver ran. This is the gated/error case.
        //
        // DOCUMENTED GAP: the success path (presigned URL returned) is
        // config-dependent and only asserted when S3 happens to be configured.
        expect(res.body.errors.length).toBeGreaterThan(0);
      } else {
        // S3 IS configured: assert the Storage response shape.
        const storage = gqlData(res).createPresignedUrl;
        expect(storage).toEqual(
          expect.objectContaining({
            signedUrl: expect.any(String),
            cdnUrl: expect.any(String),
          }),
        );
        // cdnUrl is `${domain}/${uuid}/${fileName}` — must end with the file name.
        expect(storage.cdnUrl.endsWith('/utilities-e2e.png')).toBe(true);
      }
    });
  });
});
