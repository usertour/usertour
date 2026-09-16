import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SubscriptionService } from './subscription.service';
import { CheckCanceledSubscriptionsProcessor } from './subscription.processor';
import { QUEUE_CHECK_CANCELED_SUBSCRIPTIONS } from '@/common/consts/queen';
import { StripeModule } from '@golevelup/nestjs-stripe';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionResolver } from './subscription.resolver';
import { PermissionGuard } from '@/auth/permission/permission.guard';
import { ProjectsModule } from '@/projects/projects.module';

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
