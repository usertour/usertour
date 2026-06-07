import { INestApplication } from '@nestjs/common';
import { STRIPE_CLIENT_TOKEN } from '@golevelup/nestjs-stripe';
import { PrismaService } from 'nestjs-prisma';

import { graphql, gqlData } from '../auth';
import { createTestApp } from '../create-test-app';
import { buildEnvironment, buildProject, buildSession, buildSubscription } from '../factories';
import { buildAuthorizedUser, teardownProject } from './_support';

/**
 * Functional e2e for the `subscription` GraphQL resolver. Mirrors the themes
 * template: run as OWNER, assert each op's effect (DB read shape for the query
 * ops, mocked-URL flow-through for the Stripe-backed mutations). Stripe is the
 * only external client these ops touch, so the test module swaps the
 * `@InjectStripeClient()` provider (the `STRIPE_CLIENT_TOKEN` symbol exported by
 * `@golevelup/nestjs-stripe`) for a plain object mock — no network, no keys.
 * Auth (who-can-call) is covered by permission.e2e-spec; here we run as OWNER.
 */
describe('GraphQL subscription (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let projectId: string;
  let token: string;
  const userIds: string[] = [];
  const planIds: string[] = [];

  // Canned Stripe responses — only the methods/paths the service actually calls.
  const CHECKOUT_URL = 'https://checkout.stripe.com/c/pay/cs_e2e_123';
  const PORTAL_URL = 'https://billing.stripe.com/p/session/bps_e2e_123';

  const mockStripe = {
    prices: {
      list: jest.fn().mockResolvedValue({
        data: [{ id: 'price_e2e_123', product: { id: 'prod_e2e_123' } }],
      }),
    },
    customers: {
      list: jest.fn().mockResolvedValue({ data: [] }),
    },
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: 'cs_e2e_123',
          url: CHECKOUT_URL,
          customer: 'cus_e2e_123',
        }),
      },
    },
    billingPortal: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: 'bps_e2e_123',
          url: PORTAL_URL,
        }),
      },
    },
  };

  beforeAll(async () => {
    app = await createTestApp((b) => b.overrideProvider(STRIPE_CLIENT_TOKEN).useValue(mockStripe));
    prisma = app.get(PrismaService);

    const project = await buildProject(prisma, { name: 'gql-subscription' });
    projectId = project.id;
    const owner = await buildAuthorizedUser(prisma, app, { projectId, role: 'OWNER' });
    token = owner.token;
    userIds.push(owner.user.id);
  }, 60000);

  afterAll(async () => {
    if (prisma) {
      // CheckoutSession rows are not project-scoped in teardownProject — clean
      // up the ones createCheckoutSession persisted before tearing the project.
      await prisma.checkoutSession.deleteMany({ where: { projectId } });
      if (planIds.length) {
        await prisma.subscriptionPlan.deleteMany({ where: { id: { in: planIds } } });
      }
      await teardownProject(prisma, projectId);
      if (userIds.length) {
        await prisma.user.deleteMany({ where: { id: { in: userIds } } });
      }
    }
    await app?.close();
  });

  beforeEach(() => {
    // mockReset wipes call history AND any unconsumed `...Once` queues, so a
    // case that queued a one-shot response but didn't reach it can't leak into
    // the next test. Re-establish the canned defaults afterwards.
    mockStripe.prices.list.mockReset().mockResolvedValue({
      data: [{ id: 'price_e2e_123', product: { id: 'prod_e2e_123' } }],
    });
    // Default: no pre-existing Stripe customer for the project's owner.
    mockStripe.customers.list.mockReset().mockResolvedValue({ data: [] });
    mockStripe.checkout.sessions.create.mockReset().mockResolvedValue({
      id: 'cs_e2e_123',
      url: CHECKOUT_URL,
      customer: 'cus_e2e_123',
    });
    mockStripe.billingPortal.sessions.create.mockReset().mockResolvedValue({
      id: 'bps_e2e_123',
      url: PORTAL_URL,
    });
  });

  describe('getSubscriptionPlans', () => {
    it('returns the plans table as an array', async () => {
      const res = await graphql(app, {
        token,
        query: `query {
          getSubscriptionPlans {
            id planType interval lookupKey mauQuota sessionCountQuota
          }
        }`,
      });
      const plans = gqlData(res).getSubscriptionPlans;
      expect(Array.isArray(plans)).toBe(true);
    });

    it('includes a seeded plan with the expected shape', async () => {
      const plan = await prisma.subscriptionPlan.create({
        data: {
          planType: 'starter',
          interval: 'monthly',
          lookupKey: `lookup_plans_${Date.now()}`,
          mauQuota: 1234,
          sessionCountQuota: 5678,
        },
      });
      planIds.push(plan.id);

      const res = await graphql(app, {
        token,
        query: `query {
          getSubscriptionPlans { id planType interval lookupKey mauQuota sessionCountQuota }
        }`,
      });
      const plans = gqlData(res).getSubscriptionPlans;
      const seeded = plans.find((p: { id: string }) => p.id === plan.id);
      expect(seeded).toMatchObject({
        id: plan.id,
        planType: 'starter',
        interval: 'monthly',
        lookupKey: plan.lookupKey,
        mauQuota: 1234,
        sessionCountQuota: 5678,
      });
    });
  });

  describe('getSubscriptionByProjectId', () => {
    it('returns the subscription linked to the project', async () => {
      const sub = await buildSubscription(prisma, {
        projectId,
        planType: 'growth',
        interval: 'yearly',
        status: 'active',
      });

      const res = await graphql(app, {
        token,
        query: `query ($projectId: String!) {
          getSubscriptionByProjectId(projectId: $projectId) {
            id projectId subscriptionId lookupKey planType interval status isTrial
          }
        }`,
        variables: { projectId },
      });
      expect(gqlData(res).getSubscriptionByProjectId).toMatchObject({
        id: sub.id,
        projectId,
        subscriptionId: sub.subscriptionId,
        lookupKey: sub.lookupKey,
        planType: 'growth',
        interval: 'yearly',
        status: 'active',
        isTrial: false,
      });
    });

    it('errors for a project with no subscription', async () => {
      const other = await buildProject(prisma, { name: 'no-sub' });
      const res = await graphql(app, {
        token,
        query: `query ($projectId: String!) {
          getSubscriptionByProjectId(projectId: $projectId) { id }
        }`,
        variables: { projectId: other.id },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);

      await prisma.project.delete({ where: { id: other.id } });
    });
  });

  describe('getSubscriptionUsage', () => {
    it('counts this-month BizSessions for the project', async () => {
      const env = await buildEnvironment(prisma, { projectId });
      // Sessions must carry the project id directly — getSubscriptionUsage
      // counts bizSession by projectId, and buildSession defaults it to "".
      await buildSession(prisma, { projectId, environmentId: env.id });
      await buildSession(prisma, { projectId, environmentId: env.id });

      const res = await graphql(app, {
        token,
        query: `query ($projectId: String!) {
          getSubscriptionUsage(projectId: $projectId)
        }`,
        variables: { projectId },
      });
      const usage = gqlData(res).getSubscriptionUsage;
      expect(typeof usage).toBe('number');
      expect(usage).toBeGreaterThanOrEqual(2);
    });

    it('returns 0 for a project with no sessions', async () => {
      const other = await buildProject(prisma, { name: 'no-usage' });
      const res = await graphql(app, {
        token,
        query: `query ($projectId: String!) {
          getSubscriptionUsage(projectId: $projectId)
        }`,
        variables: { projectId: other.id },
      });
      expect(gqlData(res).getSubscriptionUsage).toBe(0);

      await prisma.project.delete({ where: { id: other.id } });
    });
  });

  describe('createCheckoutSession', () => {
    it('returns the mocked checkout URL and persists a CheckoutSession', async () => {
      // The service requires a SubscriptionPlan matching planType+interval.
      const plan = await prisma.subscriptionPlan.create({
        data: {
          planType: 'business',
          interval: 'monthly',
          lookupKey: `lookup_checkout_${Date.now()}`,
        },
      });
      planIds.push(plan.id);

      const res = await graphql(app, {
        token,
        query: `mutation ($data: CreateCheckoutSessionRequest!) {
          createCheckoutSession(data: $data)
        }`,
        variables: {
          data: { projectId, planType: 'business', interval: 'monthly' },
        },
      });
      expect(gqlData(res).createCheckoutSession).toBe(CHECKOUT_URL);

      // Mock was called with the seeded lookup key + the project as reference.
      expect(mockStripe.prices.list).toHaveBeenCalledWith(
        expect.objectContaining({ lookup_keys: [plan.lookupKey] }),
      );
      expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'subscription',
          client_reference_id: projectId,
          line_items: [{ price: 'price_e2e_123', quantity: 1 }],
        }),
      );

      // The CheckoutSession row was persisted against the project.
      const row = await prisma.checkoutSession.findFirst({
        where: { projectId, sessionId: 'cs_e2e_123' },
      });
      expect(row).toMatchObject({
        projectId,
        sessionId: 'cs_e2e_123',
        lookupKey: plan.lookupKey,
      });
    });

    it('errors when no plan matches the requested type/interval', async () => {
      const res = await graphql(app, {
        token,
        query: `mutation ($data: CreateCheckoutSessionRequest!) {
          createCheckoutSession(data: $data)
        }`,
        variables: {
          data: { projectId, planType: 'hobby', interval: 'yearly' },
        },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
      expect(mockStripe.checkout.sessions.create).not.toHaveBeenCalled();
    });
  });

  describe('createPortalSession', () => {
    // Use fresh project+owner per case: the project's customerId column is
    // mutated by createCheckoutSession (and by the success case here), so a
    // shared project would make customers.list reachable/unreachable
    // non-deterministically across test order.
    it('returns the mocked portal URL after finding the customer by email', async () => {
      const other = await buildProject(prisma, { name: 'portal-found' });
      const member = await buildAuthorizedUser(prisma, app, {
        projectId: other.id,
        role: 'OWNER',
      });
      userIds.push(member.user.id);

      // No customerId on the project → the service falls back to looking the
      // customer up by the owner's email via customers.list.
      mockStripe.customers.list.mockResolvedValueOnce({
        data: [{ id: 'cus_portal_existing' }],
      });

      const res = await graphql(app, {
        token: member.token,
        query: `mutation ($projectId: String!) {
          createPortalSession(projectId: $projectId)
        }`,
        variables: { projectId: other.id },
      });
      expect(gqlData(res).createPortalSession).toBe(PORTAL_URL);

      expect(mockStripe.customers.list).toHaveBeenCalledWith(
        expect.objectContaining({ email: member.user.email, limit: 1 }),
      );
      expect(mockStripe.billingPortal.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({ customer: 'cus_portal_existing' }),
      );

      await teardownProject(prisma, other.id);
    });

    it('errors when no Stripe customer can be found for the owner', async () => {
      const other = await buildProject(prisma, { name: 'portal-none' });
      const member = await buildAuthorizedUser(prisma, app, {
        projectId: other.id,
        role: 'OWNER',
      });
      userIds.push(member.user.id);
      mockStripe.customers.list.mockResolvedValueOnce({ data: [] });

      const res = await graphql(app, {
        token: member.token,
        query: `mutation ($projectId: String!) {
          createPortalSession(projectId: $projectId)
        }`,
        variables: { projectId: other.id },
      });
      expect(res.body.errors?.length).toBeGreaterThan(0);
      expect(mockStripe.billingPortal.sessions.create).not.toHaveBeenCalled();

      await teardownProject(prisma, other.id);
    });
  });
});
