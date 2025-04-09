import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Stripe from 'stripe';
import { InjectStripeClient, StripeWebhookHandler } from '@golevelup/nestjs-stripe';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  CreateCheckoutSessionRequest,
  SubscriptionInterval,
  SubscriptionPlanType,
} from './subscription.dto';
import { CreateSubscriptionParam } from '@/subscription/subscription.dto';
import { Subscription, Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { QUEUE_CHECK_CANCELED_SUBSCRIPTIONS } from '@/common/consts/queen';
import { PrismaService } from 'nestjs-prisma';
import { ParamsError } from '@/common/errors';
import { User } from '@/users/models/user.model';

@Injectable()
export class SubscriptionService implements OnModuleInit {
  private logger = new Logger(SubscriptionService.name);
  private readonly INIT_TIMEOUT = 10000; // 10 seconds timeout

  constructor(
    protected readonly prisma: PrismaService,
    private readonly config: ConfigService,
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

  async createCheckoutSession(user: User, param: CreateCheckoutSessionRequest) {
    const { id } = user;
    const { planType, interval } = param;
    const userPo = await this.prisma.user.findUnique({ where: { id } });

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
    let customerId = userPo?.customerId;

    if (!customerId && userPo?.email) {
      // Search for existing customers with this email
      const existingCustomers = await this.stripeClient.customers.list({
        email: userPo.email,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        // Use existing customer if found
        customerId = existingCustomers.data[0].id;

        // Update user with the found customerId
        await this.prisma.user.update({
          where: { id },
          data: { customerId },
        });
      }
    }

    const price = prices.data[0];
    const session = await this.stripeClient.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: price.id, quantity: 1 }],
      success_url: this.config.get('stripe.sessionSuccessUrl'),
      cancel_url: this.config.get('stripe.sessionCancelUrl'),
      client_reference_id: id,
      customer: customerId || undefined,
      customer_email: !customerId ? userPo?.email : undefined,
      allow_promotion_codes: true,
    });

    await this.prisma.$transaction([
      this.prisma.checkoutSession.create({
        data: {
          userId: id,
          sessionId: session.id,
          lookupKey,
        },
      }),
      // Only update if customer ID changed
      ...(!userPo?.customerId || userPo.customerId !== session.customer
        ? [
            this.prisma.user.update({
              where: { id },
              data: { customerId: session.customer as string },
            }),
          ]
        : []),
    ]);

    return session;
  }

  async createPortalSession(user: User) {
    const userPo = await this.prisma.user.findUnique({
      select: { customerId: true, email: true },
      where: { id: user?.id },
    });
    if (!userPo) {
      throw new ParamsError(`No user found for uid ${user?.id}`);
    }

    let customerId = userPo?.customerId;
    if (!customerId) {
      // Check if email exists before searching
      if (!userPo?.email) {
        throw new ParamsError(`User ${user?.id} has no email address`);
      }

      // Search for existing customers with this email
      const existingCustomers = await this.stripeClient.customers.list({
        email: userPo.email,
        limit: 1,
      });

      if (existingCustomers?.data?.length > 0) {
        // Use existing customer if found
        customerId = existingCustomers.data[0]?.id;

        // Update user with the found customerId
        await this.prisma.user.update({
          where: { id: user?.id },
          data: { customerId },
        });
      } else {
        throw new ParamsError(`No customer found for user ${user?.id}`);
      }
    }

    const session = await this.stripeClient.billingPortal.sessions.create({
      customer: customerId,
      return_url: this.config.get('stripe.portalReturnUrl'),
    });
    return session;
  }

  async getSubscription(subscriptionId: string) {
    return this.prisma.subscription.findUnique({
      where: { subscriptionId },
    });
  }

  async createSubscription(userId: string, param: CreateSubscriptionParam) {
    this.logger.log(`Creating subscription for user ${userId}: ${JSON.stringify(param)}`);

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
          userId,
          status: param.status,
        },
      });

      // Update user's subscriptionId
      await prisma.user.update({
        where: { id: userId },
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

      const user = await prisma.user.findUnique({ where: { id: sub.userId } });
      if (!user) {
        this.logger.error(`No user found for uid ${sub.userId}`);
        return;
      }

      // Proceed only if the user's current subscription matches the one to be canceled
      if (user.subscriptionId !== sub.subscriptionId) {
        this.logger.warn(`Subscription ${sub.subscriptionId} not valid for user ${user.id}`);
        return;
      }

      // Remove user's subscriptionId
      await prisma.user.update({
        where: { id: sub.userId },
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
    this.logger.log(`Checkout session completed: ${JSON.stringify(session)}`);

    if (session.payment_status !== 'paid') {
      this.logger.warn(`Checkout session ${session.id} not paid`);
      return;
    }

    const userId = session.client_reference_id;
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

    if (checkoutSession.userId !== userId) {
      this.logger.error(`Checkout session ${session.id} does not match user ${userId}`);
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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { customerId: true },
    });

    // Update user's customerId if it's missing or different
    if (!user?.customerId || user.customerId !== customerId) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { customerId },
      });
    }

    const plan = await this.prisma.subscriptionPlan.findFirstOrThrow({
      where: { lookupKey: checkoutSession.lookupKey },
    });

    const { planType, interval } = plan;

    await this.createSubscription(userId, {
      planType: planType as SubscriptionPlanType,
      interval: interval as SubscriptionInterval,
      lookupKey: checkoutSession.lookupKey,
      status: 'active',
      subscriptionId,
      customerId,
    });

    this.logger.log(`Successfully processed checkout session ${session.id} for user ${userId}`);
  }

  @StripeWebhookHandler('customer.subscription.created')
  async handleSubscriptionCreated(event: Stripe.Event) {
    const subscription = event.data.object as Stripe.Subscription;
    this.logger.log(`New subscription created: ${subscription.id}`);
  }

  @StripeWebhookHandler('customer.subscription.updated')
  async handleSubscriptionUpdated(event: Stripe.Event) {
    const subscription = event.data.object as Stripe.Subscription;
    this.logger.log(`Subscription updated: ${subscription.id}`);

    const sub = await this.prisma.subscription.findUnique({
      where: { subscriptionId: subscription.id },
    });
    if (!sub) {
      this.logger.error(`No subscription found for subscription ${subscription.id}`);
      return;
    }

    const updates: Prisma.SubscriptionUpdateInput = {};

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
    this.logger.log(`Subscription deleted: ${subscription.id}`);

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

  async getSubscriptionPlans() {
    return this.prisma.subscriptionPlan.findMany();
  }
}
