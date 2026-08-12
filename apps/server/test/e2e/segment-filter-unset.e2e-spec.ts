import { INestApplication } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BizAttributeTypes } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';

import { Attribute } from '@/attributes/models/attribute.model';
import { createFilterItem } from '@/common/attribute/filter';
import { createTestApp } from './create-test-app';
import { buildBizUser, buildEnvironment, buildProject } from './factories';

/**
 * Pins how the segment SQL filter (createFilterItem → Prisma JSONB where)
 * treats an attribute the user NEVER had — the key absent from `data` — vs an
 * explicit null / '' value. The in-memory evaluator (@usertour/helpers
 * conditions/attribute.ts) answers these per user at runtime for start-rule
 * attribute conditions; condition-based segments compile to THIS filter
 * instead, so any disagreement between the two makes "condition written
 * directly" and "same condition wrapped in a segment" diverge for unset users.
 *
 * The in-memory contract (attribute.test.ts): unset (absent/null/'') satisfies
 * no positive comparison; `not X` and `empty` match it; `any` does not.
 */
describe('Segment SQL filter vs unset attribute values (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let environmentId: string;

  const scoreAttr = {
    id: 'attr-score',
    codeName: 'score',
    dataType: BizAttributeTypes.Number,
  } as Attribute;
  const planAttr = {
    id: 'attr-plan',
    codeName: 'plan',
    dataType: BizAttributeTypes.String,
  } as Attribute;

  const filterFor = (attrId: string, logic: string, value?: unknown) => {
    const filter = createFilterItem({ data: { logic, value, attrId } }, [scoreAttr, planAttr]);
    expect(filter).toBeTruthy();
    return filter as Prisma.BizUserWhereInput;
  };

  const matchedExternalIds = async (attrId: string, logic: string, value?: unknown) => {
    const rows = await prisma.bizUser.findMany({
      where: { environmentId, AND: [filterFor(attrId, logic, value)] },
      select: { externalId: true },
    });
    return rows.map((row) => row.externalId).sort();
  };

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const projectId = (await buildProject(prisma, { name: 'segment-filter-unset' })).id;
    environmentId = (await buildEnvironment(prisma, { projectId })).id;

    const seed = (externalId: string, data: object) =>
      buildBizUser(prisma, { environmentId, externalId, data });
    // The four shapes an "unset-ish" number can take, plus a real value.
    await seed('num-absent', {}); // key not present at all
    await seed('num-null', { score: null }); // explicit JSON null
    await seed('num-empty-string', { score: '' });
    await seed('num-five', { score: 5 });
    // String twin for the `not` exclusion claim.
    await seed('str-absent', {});
    await seed('str-null', { plan: null });
    await seed('str-pro', { plan: 'pro' });
    await seed('str-free', { plan: 'free' });
  }, 60000);

  afterAll(async () => {
    if (prisma && environmentId) {
      await prisma.bizUser.deleteMany({ where: { environmentId } });
      const env = await prisma.environment.findUnique({ where: { id: environmentId } });
      await prisma.environment.deleteMany({ where: { id: environmentId } });
      if (env) await prisma.project.deleteMany({ where: { id: env.projectId } });
    }
    await app?.close();
  });

  it('number `empty` / `any` / `not` — which unset shapes the SQL side sees', async () => {
    const numUsers = (ids: string[]) => ids.filter((id) => id.startsWith('num-'));

    const empty = numUsers(await matchedExternalIds('attr-score', 'empty'));
    const any = numUsers(await matchedExternalIds('attr-score', 'any'));
    const not5 = numUsers(await matchedExternalIds('attr-score', 'not', 5));
    const lte6 = numUsers(await matchedExternalIds('attr-score', 'isLessThanOrEqualTo', 6));

    // The verification target (F2): does `equals: AnyNull` reach the
    // key-absent user, or only the explicit JSON null?
    expect(empty).toEqual(['num-absent', 'num-empty-string', 'num-null']);
    expect(any).toEqual(['num-five']);
    expect(not5).toEqual(['num-absent', 'num-empty-string', 'num-null']);
    // Positive comparisons must not see unset values (matches in-memory).
    expect(lte6).toEqual(['num-five']);
  });

  it('string `not` — exclusion covers unset on the SQL side too', async () => {
    const strUsers = (ids: string[]) => ids.filter((id) => id.startsWith('str-'));

    const notPro = strUsers(await matchedExternalIds('attr-plan', 'not', 'pro'));
    expect(notPro).toEqual(['str-absent', 'str-free', 'str-null']);
  });
});
