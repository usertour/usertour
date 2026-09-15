import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Capability } from '@usertour/types';
import { SubscriptionService } from './subscription.service';
import { CreateCheckoutSessionRequest } from './subscription.dto';
import { SubscriptionModel, SubscriptionPlanModel } from './subscription.model';
import { RequirePermission } from '@/auth/permission/require-permission.decorator';
import { ScopeKind } from '@/auth/permission/scope-resolver.registry';
import { UserEntity } from '@/common/decorators/user.decorator';
import { User } from '@/users/models/user.model';

@Resolver()
export class SubscriptionResolver {
  constructor(private subscriptionService: SubscriptionService) {}

  @Mutation(() => String)
  @RequirePermission({ capability: Capability.BillingManage, scope: ScopeKind.Project })
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
  @RequirePermission({ capability: Capability.BillingManage, scope: ScopeKind.Project })
  async createPortalSession(
    @UserEntity() user: User,
    @Args('projectId') projectId: string,
  ): Promise<string> {
    const session = await this.subscriptionService.createPortalSession(user.id, projectId);
    return session.url;
  }

  // Plan catalogue — instance-wide, not project-scoped. Any signed-in user may
  // read it (the pricing page needs it before a project is even selected).
  @Query(() => [SubscriptionPlanModel])
  async getSubscriptionPlans(): Promise<SubscriptionPlanModel[]> {
    return this.subscriptionService.getSubscriptionPlans();
  }

  // The project's subscription and usage feed plan gates for EVERY member
  // (upgrade banner, plan limits, machine-translation gate), so they are
  // membership reads (ProjectRead), not billing reads: BillingRead is
  // owner-only and would redirect viewers/admins off the page.
  @Query(() => SubscriptionModel)
  @RequirePermission({ capability: Capability.ProjectRead, scope: ScopeKind.Project })
  async getSubscriptionByProjectId(
    @Args('projectId') projectId: string,
  ): Promise<SubscriptionModel> {
    return this.subscriptionService.getSubscriptionByProjectId(projectId);
  }

  @Query(() => Number)
  @RequirePermission({ capability: Capability.ProjectRead, scope: ScopeKind.Project })
  async getSubscriptionUsage(@Args('projectId') projectId: string): Promise<number> {
    return this.subscriptionService.getSubscriptionUsage(projectId);
  }
}
