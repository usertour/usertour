import { INestApplication } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';

import { ConditionEvaluationService } from '@/web-socket/core/condition-evaluation.service';
import { graphql, gqlData } from '../auth';
import { createTestApp } from '../create-test-app';
import {
  buildAttribute,
  buildBizCompany,
  buildBizUser,
  buildBizUserOnCompany,
  buildEnvironment,
  buildProject,
  buildSegment,
} from '../factories';
import { buildAuthorizedUser, teardownProject } from './_support';

/**
 * Functional e2e for cross-entity segment condition filters — user conditions
 * mixing company/membership attributes and company conditions mixing
 * user/membership attributes — executed against a real Postgres so the
 * compiled Prisma JSON/relation filters are validated end-to-end, not just
 * shape-asserted (see src/common/attribute/filter.spec.ts for the shapes).
 *
 * The semantics under test:
 *  - One existential quantifier over the whole tree: AND-ed cross-entity
 *    conditions must be satisfied by the SAME membership row.
 *  - Offline queries scan every membership ("any associated company");
 *    users/companies without memberships can still match through the
 *    fallback branch (cross-entity leaves = false) in OR-ed trees.
 *  - Runtime evaluation binds company/membership leaves to the session's
 *    CURRENT company only, and cross-type OR is honored (regression for the
 *    per-bizType bucket partition this replaced).
 *
 * Numeric enum values (GraphQL sends names, prisma stores ints):
 * AttributeBizType USER=1 COMPANY=2 MEMBERSHIP=3; dataType Number=1 String=2;
 * SegmentBizType USER=1 COMPANY=2; SegmentDataType CONDITION=2.
 */
describe('Segment cross-entity filters (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let projectId: string;
  let environmentId: string;
  let token: string;
  const userIds: string[] = [];

  let userTierAttributeId: string;
  let companySubscriptionAttributeId: string;
  let companySeatsAttributeId: string;
  let membershipRoleAttributeId: string;

  let companyPro: { id: string; externalId: string };
  let companyFree: { id: string; externalId: string };
  let companyEmpty: { id: string; externalId: string };
  let userInPro: { id: string; externalId: string };
  let userInFree: { id: string; externalId: string };
  let userMultiOrg: { id: string; externalId: string };
  let userNoCompany: { id: string; externalId: string };

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);

    const project = await buildProject(prisma, { name: 'gql-segment-cross-entity' });
    projectId = project.id;
    const environment = await buildEnvironment(prisma, { projectId, isPrimary: true });
    environmentId = environment.id;

    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    token = owner.token;
    userIds.push(owner.user.id);

    const userTierAttribute = await buildAttribute(prisma, {
      projectId,
      codeName: 'tier',
      displayName: 'Tier',
      bizType: 1,
      dataType: 2,
    });
    userTierAttributeId = userTierAttribute.id;
    const companySubscriptionAttribute = await buildAttribute(prisma, {
      projectId,
      codeName: 'subscription',
      displayName: 'Subscription',
      bizType: 2,
      dataType: 2,
    });
    companySubscriptionAttributeId = companySubscriptionAttribute.id;
    const companySeatsAttribute = await buildAttribute(prisma, {
      projectId,
      codeName: 'seats',
      displayName: 'Seats',
      bizType: 2,
      dataType: 1,
    });
    companySeatsAttributeId = companySeatsAttribute.id;
    const membershipRoleAttribute = await buildAttribute(prisma, {
      projectId,
      codeName: 'role',
      displayName: 'Role',
      bizType: 3,
      dataType: 2,
    });
    membershipRoleAttributeId = membershipRoleAttribute.id;

    companyPro = await buildBizCompany(prisma, {
      environmentId,
      data: { subscription: 'pro', seats: 5 },
    });
    companyFree = await buildBizCompany(prisma, {
      environmentId,
      data: { subscription: 'free', seats: 20 },
    });
    companyEmpty = await buildBizCompany(prisma, {
      environmentId,
      data: { subscription: 'enterprise', seats: 50 },
    });

    userInPro = await buildBizUser(prisma, { environmentId, data: { tier: 'basic' } });
    userInFree = await buildBizUser(prisma, { environmentId, data: { tier: 'basic' } });
    userMultiOrg = await buildBizUser(prisma, { environmentId, data: { tier: 'basic' } });
    userNoCompany = await buildBizUser(prisma, { environmentId, data: { tier: 'vip' } });

    await buildBizUserOnCompany(prisma, {
      bizUserId: userInPro.id,
      bizCompanyId: companyPro.id,
      data: { role: 'admin' },
    });
    await buildBizUserOnCompany(prisma, {
      bizUserId: userInFree.id,
      bizCompanyId: companyFree.id,
      data: { role: 'member' },
    });
    // userMultiOrg belongs to BOTH companies, with role admin only in the
    // free one — the fixture that separates same-row from per-row semantics.
    await buildBizUserOnCompany(prisma, {
      bizUserId: userMultiOrg.id,
      bizCompanyId: companyPro.id,
      data: { role: 'member' },
    });
    await buildBizUserOnCompany(prisma, {
      bizUserId: userMultiOrg.id,
      bizCompanyId: companyFree.id,
      data: { role: 'admin' },
    });
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

  const userAttributeCondition = (
    attrId: string,
    logic: string,
    value: string,
    operators: 'and' | 'or' = 'and',
  ) => ({
    type: 'user-attr',
    operators,
    data: { attrId, logic, value },
  });

  const queryBizUserExternalIds = async (conditions: unknown[]): Promise<string[]> => {
    const res = await graphql(app, {
      token,
      query: `query ($query: BizQuery!, $orderBy: BizOrder!, $first: Int) {
        queryBizUser(query: $query, orderBy: $orderBy, first: $first) {
          totalCount
          edges { node { id externalId } }
        }
      }`,
      variables: {
        query: { environmentId, data: conditions },
        orderBy: { field: 'createdAt', direction: 'asc' },
        first: 50,
      },
    });
    const conn = gqlData(res).queryBizUser;
    return conn.edges.map((edge: { node: { externalId: string } }) => edge.node.externalId);
  };

  const queryBizCompanyExternalIds = async (conditions: unknown[]): Promise<string[]> => {
    const res = await graphql(app, {
      token,
      query: `query ($query: BizQuery!, $orderBy: BizOrder!, $first: Int) {
        queryBizCompany(query: $query, orderBy: $orderBy, first: $first) {
          totalCount
          edges { node { id externalId } }
        }
      }`,
      variables: {
        query: { environmentId, data: conditions },
        orderBy: { field: 'createdAt', direction: 'asc' },
        first: 50,
      },
    });
    const conn = gqlData(res).queryBizCompany;
    return conn.edges.map((edge: { node: { externalId: string } }) => edge.node.externalId);
  };

  describe('queryBizUser with cross-entity conditions', () => {
    it('filters users by a company attribute across their memberships', async () => {
      const externalIds = await queryBizUserExternalIds([
        userAttributeCondition(companySubscriptionAttributeId, 'is', 'pro'),
      ]);
      expect(externalIds.sort()).toEqual([userInPro.externalId, userMultiOrg.externalId].sort());
    });

    it('matches membership-less users through the fallback branch of an OR-ed mixed tree', async () => {
      const externalIds = await queryBizUserExternalIds([
        userAttributeCondition(userTierAttributeId, 'is', 'vip', 'or'),
        userAttributeCondition(companySubscriptionAttributeId, 'is', 'pro', 'or'),
      ]);
      expect(externalIds.sort()).toEqual(
        [userInPro.externalId, userMultiOrg.externalId, userNoCompany.externalId].sort(),
      );
    });

    it('binds AND-ed company conditions to one membership row (no cross-company mixing)', async () => {
      // userMultiOrg belongs to a pro org (5 seats) and a 20-seat org (free):
      // no single org is pro AND >10 seats, so per-row semantics would match
      // it while same-row semantics must not.
      const acrossOrgs = await queryBizUserExternalIds([
        userAttributeCondition(companySubscriptionAttributeId, 'is', 'pro'),
        userAttributeCondition(companySeatsAttributeId, 'isGreaterThan', '10'),
      ]);
      expect(acrossOrgs).toEqual([]);

      const withinOrg = await queryBizUserExternalIds([
        userAttributeCondition(companySubscriptionAttributeId, 'is', 'pro'),
        userAttributeCondition(companySeatsAttributeId, 'isLessThan', '10'),
      ]);
      expect(withinOrg.sort()).toEqual([userInPro.externalId, userMultiOrg.externalId].sort());
    });

    it('binds membership and company conditions to the same membership row', async () => {
      // userMultiOrg is admin only in the free org, so "admin in a pro org"
      // must match userInPro alone.
      const externalIds = await queryBizUserExternalIds([
        userAttributeCondition(membershipRoleAttributeId, 'is', 'admin'),
        userAttributeCondition(companySubscriptionAttributeId, 'is', 'pro'),
      ]);
      expect(externalIds).toEqual([userInPro.externalId]);
    });
  });

  describe('queryBizCompany with cross-entity conditions', () => {
    it('filters companies by a user attribute across their members', async () => {
      const withBasicMember = await queryBizCompanyExternalIds([
        userAttributeCondition(userTierAttributeId, 'is', 'basic'),
      ]);
      expect(withBasicMember.sort()).toEqual(
        [companyPro.externalId, companyFree.externalId].sort(),
      );

      // The only vip user has no memberships, so no company can reach them.
      const withVipMember = await queryBizCompanyExternalIds([
        userAttributeCondition(userTierAttributeId, 'is', 'vip'),
      ]);
      expect(withVipMember).toEqual([]);
    });

    it('excludes member-less companies from membership-only conditions', async () => {
      const externalIds = await queryBizCompanyExternalIds([
        userAttributeCondition(membershipRoleAttributeId, 'is', 'admin'),
      ]);
      expect(externalIds.sort()).toEqual([companyPro.externalId, companyFree.externalId].sort());
    });

    it('matches member-less companies through the company-only fallback of an OR-ed tree', async () => {
      const externalIds = await queryBizCompanyExternalIds([
        userAttributeCondition(companySubscriptionAttributeId, 'is', 'enterprise', 'or'),
        userAttributeCondition(membershipRoleAttributeId, 'is', 'admin', 'or'),
      ]);
      expect(externalIds.sort()).toEqual(
        [companyEmpty.externalId, companyPro.externalId, companyFree.externalId].sort(),
      );
    });
  });

  describe('runtime segment evaluation (ConditionEvaluationService)', () => {
    const evaluateSegmentForUser = async (
      segmentId: string,
      bizUserId: string,
      externalCompanyId?: string,
    ): Promise<boolean> => {
      const conditionEvaluation = app.get(ConditionEvaluationService);
      const environment = await prisma.environment.findUniqueOrThrow({
        where: { id: environmentId },
      });
      const attributes = await prisma.attribute.findMany({ where: { projectId } });
      const bizUser = await prisma.bizUser.findUniqueOrThrow({ where: { id: bizUserId } });
      const evaluated = await conditionEvaluation.evaluateRulesConditions(
        [{ type: 'segment', data: { segmentId, logic: 'is' } } as any],
        { environment, attributes, bizUser, externalCompanyId },
      );
      return evaluated[0].actived === true;
    };

    it('binds user segment company conditions to the current company only', async () => {
      const segment = await buildSegment(prisma, {
        projectId,
        environmentId,
        bizType: 1,
        dataType: 2,
        data: [userAttributeCondition(companySubscriptionAttributeId, 'is', 'pro')],
      });

      // Same user, same segment — only the session's company context differs.
      await expect(
        evaluateSegmentForUser(segment.id, userMultiOrg.id, companyPro.externalId),
      ).resolves.toBe(true);
      await expect(
        evaluateSegmentForUser(segment.id, userMultiOrg.id, companyFree.externalId),
      ).resolves.toBe(false);
      await expect(evaluateSegmentForUser(segment.id, userMultiOrg.id)).resolves.toBe(false);
    });

    it('honors OR across entity types in company segment conditions', async () => {
      // Regression for the per-bizType bucket partition: subscription is
      // 'enterprise' OR some member is admin. companyPro is not enterprise
      // but has an admin member — the old bucket-AND evaluation returned
      // false here.
      const segment = await buildSegment(prisma, {
        projectId,
        environmentId,
        bizType: 2,
        dataType: 2,
        data: [
          userAttributeCondition(companySubscriptionAttributeId, 'is', 'enterprise', 'or'),
          userAttributeCondition(membershipRoleAttributeId, 'is', 'admin', 'or'),
        ],
      });

      await expect(
        evaluateSegmentForUser(segment.id, userInPro.id, companyPro.externalId),
      ).resolves.toBe(true);
      // userInFree's current company is free (not enterprise) and its only
      // admin is userMultiOrg — the OR still matches through the membership
      // branch, so scope the negative case to a segment the company cannot
      // satisfy: enterprise-only.
      const enterpriseOnly = await buildSegment(prisma, {
        projectId,
        environmentId,
        bizType: 2,
        dataType: 2,
        data: [userAttributeCondition(companySubscriptionAttributeId, 'is', 'enterprise')],
      });
      await expect(
        evaluateSegmentForUser(enterpriseOnly.id, userInFree.id, companyFree.externalId),
      ).resolves.toBe(false);
    });
  });
});
