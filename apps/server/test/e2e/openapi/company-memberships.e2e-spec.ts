import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import type { BizUserOnCompany } from '@prisma/client';

import { OpenApiObjectType } from '@/common/openapi/types';

import { createTestApp } from '../create-test-app';
import { buildBizCompany, buildBizUser, buildBizUserOnCompany } from '../factories';
import {
  AUTH_CASES,
  OpenApiFixture,
  openapi,
  seedApiFixture,
  teardownApiFixture,
} from '../openapi';

/** Real-DB contract test for `DELETE /v1/company-memberships`. */
describe('OpenAPI /v1/company-memberships (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let fxA: OpenApiFixture;
  let fxB: OpenApiFixture;
  let fxInactive: OpenApiFixture;

  // tenant A membership (deleted by the happy-path test)
  const userExternalId = 'm-user';
  const companyExternalId = 'm-co';
  // tenant B membership (for IDOR)
  const foreignUserExternalId = 'm-user-b';
  const foreignCompanyExternalId = 'm-co-b';
  let foreignMembership: BizUserOnCompany;

  const seedMembership = async (fx: OpenApiFixture, userExt: string, companyExt: string) => {
    const user = await buildBizUser(prisma, {
      environmentId: fx.environmentId,
      externalId: userExt,
    });
    const company = await buildBizCompany(prisma, {
      environmentId: fx.environmentId,
      externalId: companyExt,
    });
    return buildBizUserOnCompany(prisma, { bizUserId: user.id, bizCompanyId: company.id });
  };

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    fxA = await seedApiFixture(prisma, { projectName: 'openapi-memberships-a' });
    fxB = await seedApiFixture(prisma, { projectName: 'openapi-memberships-b' });
    fxInactive = await seedApiFixture(prisma, {
      projectName: 'openapi-memberships-inactive',
      isActive: false,
    });

    await seedMembership(fxA, userExternalId, companyExternalId);
    foreignMembership = await seedMembership(fxB, foreignUserExternalId, foreignCompanyExternalId);
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      for (const fx of [fxA, fxB, fxInactive]) {
        if (fx) {
          await teardownApiFixture(prisma, fx);
        }
      }
    }
    await app?.close();
  });

  describe('auth contract', () => {
    for (const c of AUTH_CASES) {
      it(`rejects: ${c.name}`, async () => {
        const res = await openapi(app, {
          method: 'delete',
          path: '/v1/company-memberships',
          query: { userId: 'x', companyId: 'y' },
          rawAuthHeader: c.rawAuthHeader,
          token: c.token,
        });
        expect(res.status).toBe(c.status);
        expect(res.body.error.code).toBe(c.code);
      });
    }

    it('rejects an inactive key (403 E1000)', async () => {
      const res = await openapi(app, {
        method: 'delete',
        path: '/v1/company-memberships',
        query: { userId: 'x', companyId: 'y' },
        token: fxInactive.apiKey,
      });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('E1000');
    });
  });

  describe('delete contract', () => {
    it('returns 404 for a non-existent membership', async () => {
      const res = await openapi(app, {
        method: 'delete',
        path: '/v1/company-memberships',
        query: { userId: 'nobody', companyId: 'nothing' },
        token: fxA.apiKey,
      });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('E1003');
    });

    it('deletes an existing membership', async () => {
      const res = await openapi(app, {
        method: 'delete',
        path: '/v1/company-memberships',
        query: { userId: userExternalId, companyId: companyExternalId },
        token: fxA.apiKey,
      });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        object: OpenApiObjectType.COMPANY_MEMBERSHIP,
        deleted: true,
      });
      expect(typeof res.body.id).toBe('string');
    });
  });

  describe('environment-scoping (IDOR)', () => {
    it("cannot delete another environment's membership, and the row survives", async () => {
      const res = await openapi(app, {
        method: 'delete',
        path: '/v1/company-memberships',
        query: { userId: foreignUserExternalId, companyId: foreignCompanyExternalId },
        token: fxA.apiKey,
      });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('E1003');

      const survivor = await prisma.bizUserOnCompany.findUnique({
        where: { id: foreignMembership.id },
      });
      expect(survivor).not.toBeNull();
    });
  });
});
