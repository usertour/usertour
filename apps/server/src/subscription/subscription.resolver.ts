import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { SubscriptionService } from './subscription.service';
import { CreateCheckoutSessionRequest } from './subscription.dto';
import { SubscriptionModel, SubscriptionPlanModel } from './subscription.model';
import { UserEntity } from '@/common/decorators/user.decorator';
import { User } from '@/users/models/user.model';

@Resolver()
export class SubscriptionResolver {
  constructor(private subscriptionService: SubscriptionService) {}

  @Mutation(() => String)
  async createCheckoutSession(
    @UserEntity() user: User,
    @Args('data') { projectId, planType, interval }: CreateCheckoutSessionRequest,
  ): Promise<string> {
    const session = await this.subscriptionService.createCheckoutSession(
      user.id,
      projectId,
      planType,
      interval,
    );
    return session.url;
  }

  @Mutation(() => String)
  async createPortalSession(
    @UserEntity() user: User,
    @Args('projectId') projectId: string,
  ): Promise<string> {
    const session = await this.subscriptionService.createPortalSession(user.id, projectId);
    return session.url;
  }

  @Query(() => [SubscriptionPlanModel])
  async getSubscriptionPlans(): Promise<SubscriptionPlanModel[]> {
    return this.subscriptionService.getSubscriptionPlans();
  }

  @Query(() => SubscriptionModel)
  async getSubscriptionByProjectId(
    @Args('projectId') projectId: string,
  ): Promise<SubscriptionModel> {
    return this.subscriptionService.getSubscriptionByProjectId(projectId);
  }

  @Query(() => Number)
  async getSubscriptionUsage(@Args('projectId') projectId: string): Promise<number> {
    return this.subscriptionService.getSubscriptionUsage(projectId);
  }
}
