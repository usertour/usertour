import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { SubscriptionService } from './subscription.service';
import { UserEntity } from '@/common/decorators/user.decorator';
import { User } from '@/users/models/user.model';
import { CreateCheckoutSessionRequest } from './subscription.dto';
import { SubscriptionPlanModel } from './subscription.model';

@Resolver()
export class SubscriptionResolver {
  constructor(private subscriptionService: SubscriptionService) {}

  @Mutation(() => String)
  async createCheckoutSession(
    @UserEntity() user: User,
    @Args('data') param: CreateCheckoutSessionRequest,
  ): Promise<string> {
    const session = await this.subscriptionService.createCheckoutSession(user, param);
    return session.url;
  }

  @Mutation(() => String)
  async createPortalSession(@UserEntity() user: User): Promise<string> {
    const session = await this.subscriptionService.createPortalSession(user);
    return session.url;
  }

  @Query(() => [SubscriptionPlanModel])
  async getSubscriptionPlans(): Promise<SubscriptionPlanModel[]> {
    return this.subscriptionService.getSubscriptionPlans();
  }
}
