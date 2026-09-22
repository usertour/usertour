import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { SubscriptionService } from '../services/subscription.service';
import { QUEUE_CHECK_CANCELED_SUBSCRIPTIONS } from '../constants/check-canceled-subscriptions-queue.constant';

@Processor(QUEUE_CHECK_CANCELED_SUBSCRIPTIONS)
export class CheckCanceledSubscriptionsProcessor extends WorkerHost {
  private readonly logger = new Logger(CheckCanceledSubscriptionsProcessor.name);

  constructor(private subscriptionService: SubscriptionService) {
    super();
  }

  async process() {
    this.logger.log(
      `[${QUEUE_CHECK_CANCELED_SUBSCRIPTIONS}] Starting check for canceled subscriptions`,
    );
    try {
      await this.subscriptionService.checkCanceledSubscriptions();
    } catch (error) {
      this.logger.error(`[${QUEUE_CHECK_CANCELED_SUBSCRIPTIONS}] error: ${error?.stack}`);
      throw error;
    }
  }
}
