import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SubscriptionService } from './services/subscription.service';
import { CheckCanceledSubscriptionsProcessor } from './processors/subscription.processor';
import { QUEUE_CHECK_CANCELED_SUBSCRIPTIONS } from './constants/check-canceled-subscriptions-queue.constant';
import { StripeModule } from '@golevelup/nestjs-stripe';
import { SubscriptionController } from './controllers/subscription.controller';
import { SubscriptionResolver } from './subscription.resolver';
import { PermissionGuard } from '@/modules/auth/permission/permission.guard';
import { ProjectsModule } from '@/modules/projects/projects.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUE_CHECK_CANCELED_SUBSCRIPTIONS,
      prefix: 'subscription_cron',
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
    (StripeModule as any).externallyConfigured(StripeModule, 0),
    // PermissionGuard resolves the caller's membership through ProjectsService.
    ProjectsModule,
  ],
  providers: [
    SubscriptionService,
    CheckCanceledSubscriptionsProcessor,
    SubscriptionResolver,
    PermissionGuard,
  ],
  controllers: [SubscriptionController],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
