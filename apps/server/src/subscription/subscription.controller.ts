import { Controller } from '@nestjs/common';
import { SubscriptionService } from '@/subscription/subscription.service';

@Controller('v1/subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}
}
