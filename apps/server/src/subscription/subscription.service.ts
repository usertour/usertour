import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Stripe from 'stripe';
import { InjectStripeClient, StripeWebhookHandler } from '@golevelup/nestjs-stripe';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SubscriptionInterval, SubscriptionPlanType } from './subscription.dto';
import { CreateSubscriptionParam } from '@/subscription/subscription.dto';
import { Subscription, Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { QUEUE_CHECK_CANCELED_SUBSCRIPTIONS } from '@/common/consts/queen';
import { PrismaService } from 'nestjs-prisma';
import { ParamsError } from '@/common/errors';
import { SubscriptionPlanModel } from './subscription.model';
import { parseSubscriptionPlan } from '@/utils/subscription';
import { startOfMonth, endOfMonth } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

@Injectable()
export class SubscriptionService implements OnModuleInit {
  private logger = new Logger(SubscriptionService.name);
  private readonly INIT_TIMEOUT = 10000; // 10 seconds timeout

  constructor(
    protected readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @InjectStripeClient() private readonly stripeClient: Stripe,
    @InjectQueue(QUEUE_CHECK_CANCELED_SUBSCRIPTIONS)
    private readonly checkCanceledSubscriptionsQueue: Queue,
  ) {}

  async onModuleInit() {
    const initPromise = this.setupSubscriptionCheckJobs();
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(`Subscription cronjob timed out after ${this.INIT_TIMEOUT}ms`);
      }, this.INIT_TIMEOUT);
    });

    try {
      await Promise.race([initPromise, timeoutPromise]);
      this.logger.log('Subscription cronjob scheduled successfully');
    } catch (error) {
      this.logger.error(`Failed to schedule subscription cronjob: ${error}`);
      throw error;
    }
  }

  private async setupSubscriptionCheckJobs() {
    // Remove any existing recurring jobs
    const existingJobs = await this.checkCanceledSubscriptionsQueue.getJobSchedulers();
    await Promise.all(
      existingJobs.map((job) => this.checkCanceledSubscriptionsQueue.removeJobScheduler(job.id)),
    );

    // Add the new recurring job with concurrency options
    await this.checkCanceledSubscriptionsQueue.add(
      'check-canceled',
      {},
      {
        repeat: {
          pattern: '0 * * * *', // Run every hour
        },
        removeOnComplete: true,
        removeOnFail: false,
        // Add job options for distributed environment
        jobId: 'check-canceled-subscriptions', // Unique job ID to prevent duplicates
        attempts: 3, // Number of retry attempts
        backoff: {
          type: 'exponential',
          delay: 1000, // Initial delay in milliseconds
        },
      },
    );

    this.logger.log('Canceled subscriptions check job scheduled');
  }

  async createCheckoutSession(
    userId: string,
    projectId: string,
    planType: SubscriptionPlanType,
    interval: SubscriptionInterval,
  ) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new ParamsError(`No project found for id: ${projectId}`);
    }
    const owner = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!owner) {
      throw new ParamsError(`No owner found for project: ${projectId}`);
    }

    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: { planType, interval },
    });
    if (!plan) {
      throw new ParamsError(`No plan found for plan type: ${planType}`);
    }
    const lookupKey = plan.lookupKey;

    const prices = await this.stripeClient.prices.list({
      lookup_keys: [lookupKey],
      expand: ['data.product'],
    });
    if (prices.data.length === 0) {
      throw new ParamsError(`No prices found for lookup key: ${lookupKey}`);
    }

    // Try to find or create customer
    let customerId = project.customerId;

    if (!customerId && owner?.email) {
      // Search for existing customers with this email
      const existingCustomers = await this.stripeClient.customers.list({
        email: owner.email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        // Use existing customer if found
        customerId = existingCustomers.data[0].id;

        // Update project with the found customerId
        await this.prisma.project.update({
          where: { id: projectId },
          data: { customerId },
        });
      }
    }

    const price = prices.data[0];
    const session = await this.stripeClient.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: this.configService.get('stripe.sessionSuccessUrl'),
      cancel_url: this.configService.get('stripe.sessionCancelUrl'),
      client_reference_id: projectId,
      customer: customerId || undefined,
      customer_email: !customerId ? owner?.email : undefined,
      allow_promotion_codes: true,
    });

    await this.prisma.$transaction(async (prisma) => {
      await prisma.checkoutSession.create({
        data: {
          projectId,
          sessionId: session.id,
          lookupKey,
        },
      });

      // Only update if customer ID changed
      if (!project.customerId || project.customerId !== session.customer) {
        await prisma.project.update({
          where: { id: projectId },
          data: { customerId: session.customer as string },
        });
      }
    });

    return session;
  }

  async createPortalSession(userId: string, projectId: string) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new ParamsError(`No project found for id: ${projectId}`);
    }
    const owner = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!owner) {
      throw new ParamsError(`No owner found for project: ${projectId}`);
    }

    let customerId = project.customerId;
    if (!customerId) {
      // Check if email exists before searching
      if (!owner?.email) {
        throw new ParamsError(`User ${owner?.id} has no email address`);
      }

      // Search for existing customers with this email
      const existingCustomers = await this.stripeClient.customers.list({
        email: owner.email,
        limit: 1,
      });

      if (existingCustomers?.data?.length > 0) {
        // Use existing customer if found
        customerId = existingCustomers.data[0]?.id;

        // Update project with the found customerId
        await this.prisma.project.update({
          where: { id: projectId },
          data: { customerId },
        });
      } else {
        throw new ParamsError(`No customer found for user ${owner?.id}`);
      }
    }

    const session = await this.stripeClient.billingPortal.sessions.create({
      customer: customerId,
      return_url: this.configService.get('stripe.portalReturnUrl'),
    });
    return session;
  }

  async getSubscription(subscriptionId: string) {
    return this.prisma.subscription.findUnique({
      where: { subscriptionId },
    });
  }

  async createSubscription(projectId: string, param: CreateSubscriptionParam) {
    this.logger.log(`Creating subscription for project ${projectId}: ${JSON.stringify(param)}`);

    return this.prisma.$transaction(async (prisma) => {
      const existingSub = await prisma.subscription.findUnique({
        where: { subscriptionId: param.subscriptionId },
      });
      if (existingSub) {
        this.logger.log(`Subscription ${param.subscriptionId} already exists`);
        return existingSub;
      }

      // Create a new subscription if needed
      const sub = await prisma.subscription.create({
        data: {
          subscriptionId: param.subscriptionId,
          lookupKey: param.lookupKey,
          planType: param.planType,
          interval: param.interval,
          projectId,
          status: param.status,
        },
      });

      // Update project's subscriptionId
      await prisma.project.update({
        where: { id: projectId },
        data: { subscriptionId: param.subscriptionId, customerId: param.customerId },
      });

      return sub;
    });
  }

  async cancelSubscription(sub: Subscription) {
    await this.prisma.$transaction(async (prisma) => {
      // Mark the subscription as canceled
      await prisma.subscription.update({
        where: { subscriptionId: sub.subscriptionId },
        data: { status: 'canceled' },
      });

      const project = await prisma.project.findUnique({ where: { id: sub.projectId } });
      if (!project) {
        this.logger.error(`No project found for uid ${sub.projectId}`);
        return;
      }

      // Proceed only if the project's current subscription matches the one to be canceled
      if (project.subscriptionId !== sub.subscriptionId) {
        this.logger.warn(`Subscription ${sub.subscriptionId} not valid for project ${project.id}`);
        return;
      }

      // Remove project's subscriptionId
      await prisma.project.update({
        where: { id: project.id },
        data: { subscriptionId: null },
      });
    });
  }

  async checkCanceledSubscriptions() {
    const now = new Date();
    const canceledSubscriptions = await this.prisma.subscription.findMany({
      where: {
        status: 'active',
        cancelAt: {
          lte: now,
        },
      },
    });

    for (const subscription of canceledSubscriptions) {
      this.logger.log(`Processing canceled subscription: ${subscription.subscriptionId}`);
      await this.cancelSubscription(subscription);
    }
  }

  @StripeWebhookHandler('checkout.session.completed')
  async handleCheckoutSessionCompleted(event: Stripe.Event) {
    const session = event.data.object as Stripe.Checkout.Session;
    this.logger.log(
      `Checkout session completed: ${JSON.stringify(session)}, data: ${JSON.stringify(event)}`,
    );

    if (session.payment_status !== 'paid') {
      this.logger.warn(`Checkout session ${session.id} not paid`);
      return;
    }

    const projectId = session.client_reference_id;
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    const checkoutSession = await this.prisma.checkoutSession.findFirst({
      where: { sessionId: session.id },
      orderBy: { id: 'desc' },
    });

    if (!checkoutSession) {
      this.logger.error(`No checkout session found for session ${session.id}`);
      return;
    }

    if (checkoutSession.projectId !== projectId) {
      this.logger.error(`Checkout session ${session.id} does not match project ${projectId}`);
      return;
    }

    await this.prisma.checkoutSession.update({
      where: { id: checkoutSession.id },
      data: {
        paymentStatus: session.payment_status,
        subscriptionId: session.subscription as string,
      },
    });

    // Check if customerId is already associated with this user
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { customerId: true },
    });

    // Update user's customerId if it's missing or different
    if (!project?.customerId || project.customerId !== customerId) {
      await this.prisma.project.update({
        where: { id: projectId },
        data: { customerId },
      });
    }

    const plan = await this.prisma.subscriptionPlan.findFirstOrThrow({
      where: { lookupKey: checkoutSession.lookupKey },
    });

    const { planType, interval } = plan;

    await this.createSubscription(projectId, {
      planType: planType as SubscriptionPlanType,
      interval: interval as SubscriptionInterval,
      lookupKey: checkoutSession.lookupKey,
      status: 'active',
      subscriptionId,
      customerId,
    });

    this.logger.log(
      `Successfully processed checkout session ${session.id} for project ${projectId}`,
    );
  }

  @StripeWebhookHandler('customer.subscription.created')
  async handleSubscriptionCreated(event: Stripe.Event) {
    const subscription = event.data.object as Stripe.Subscription;
    this.logger.log(
      `New subscription created: ${subscription.id}, data: ${JSON.stringify(subscription)}`,
    );
  }

  @StripeWebhookHandler('customer.subscription.updated')
  async handleSubscriptionUpdated(event: Stripe.Event) {
    const subscription = event.data.object as Stripe.Subscription;
    this.logger.log(
      `Subscription updated: ${subscription.id}, data: ${JSON.stringify(subscription)}`,
    );
    const lookupKey = subscription.items.data[0].price.lookup_key;

    this.logger.log(`Lookup key: ${lookupKey}`);

    const sub = await this.prisma.subscription.findUnique({
      where: { subscriptionId: subscription.id },
    });
    if (!sub) {
      this.logger.error(`No subscription found for subscription ${subscription.id}`);
      return;
    }

    const updates: Prisma.SubscriptionUpdateInput = {};

    const planInfo = parseSubscriptionPlan(lookupKey);
    if (planInfo) {
      updates.planType = planInfo.planType;
      updates.interval = planInfo.interval;
    }

    // Track status changes
    if (subscription.status !== sub.status) {
      updates.status = subscription.status;
    }

    // Track cancellation changes
    if (subscription.cancel_at && !sub.cancelAt) {
      updates.cancelAt = new Date(subscription.cancel_at * 1000);
    } else if (!subscription.cancel_at && sub.cancelAt) {
      // Handle cancellation removal (user undid cancellation)
      updates.cancelAt = null;
    }

    if (Object.keys(updates).length > 0) {
      this.logger.log(
        `Subscription ${sub.subscriptionId} received updates: ${JSON.stringify(updates)}`,
      );
      await this.prisma.subscription.update({
        where: { subscriptionId: subscription.id },
        data: updates,
      });
    }
  }

  @StripeWebhookHandler('customer.subscription.deleted')
  async handleSubscriptionDeleted(event: Stripe.Event) {
    const subscription = event.data.object as Stripe.Subscription;
    this.logger.log(
      `Subscription deleted: ${subscription.id}, data: ${JSON.stringify(subscription)}`,
    );

    const sub = await this.prisma.subscription.findUnique({
      where: { subscriptionId: subscription.id },
    });
    if (!sub) {
      this.logger.error(`No subscription found for subscription ${subscription.id}`);
      return;
    }

    if (sub.status === 'canceled') {
      this.logger.log(`Subscription ${sub.subscriptionId} already canceled`);
      return;
    }

    await this.cancelSubscription(sub);
  }

  async getSubscriptionPlans(): Promise<SubscriptionPlanModel[]> {
    return this.prisma.subscriptionPlan.findMany();
  }

  async getSubscriptionByProjectId(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { subscriptionId: true },
    });
    if (!project || !project.subscriptionId) {
      throw new ParamsError(`No subscription found for project ${projectId}`);
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { subscriptionId: project.subscriptionId },
    });
    if (!subscription) {
      throw new ParamsError(`No subscription found for project ${projectId}`);
    }
    return subscription;
  }

  async getSubscriptionUsage(projectId: string) {
    const now = new Date();
    const utcNow = toZonedTime(now, 'UTC');
    const firstDayOfMonth = startOfMonth(utcNow);
    const lastDayOfMonth = endOfMonth(utcNow);

    return this.prisma.bizSession.count({
      where: {
        projectId,
        createdAt: {
          gte: firstDayOfMonth,
          lte: lastDayOfMonth,
        },
      },
    });
  }
}
