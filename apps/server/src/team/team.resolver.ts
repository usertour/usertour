import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { User } from '@/users/models/user.model';
import { TeamService } from './team.service';
import { UserOnProject } from './models/useronproject.model';
import {
  CancelInviteInput,
  ChangeTeamMemberRoleInput,
  InviteTeamMemberInput,
  RemoveTeamMemberInput,
  ActiveUserProjectInput,
} from './dto/member.input';
import { UserEntity } from '@/common/decorators/user.decorator';
import { Role } from '@prisma/client';
import { Logger } from '@nestjs/common';
import { Invite } from './models/invite.model';
import { Public } from '@/common/decorators/public.decorator';
import { UseGuards } from '@nestjs/common';
import { EmailConfigGuard } from '@/common/guards/email-config.guard';
import { PermissionGuard } from '@/auth/permission/permission.guard';
import { RequirePermission } from '@/auth/permission/require-permission.decorator';
import { ScopeKind } from '@/auth/permission/scope-resolver.registry';
import { Capability } from '@usertour/types';

@Resolver()
@UseGuards(PermissionGuard)
export class TeamResolver {
  private readonly logger = new Logger(TeamResolver.name);
  constructor(private teamService: TeamService) {}

  @Query(() => [Invite])
  @RequirePermission({ capability: Capability.TeamRead, scope: ScopeKind.Project })
  async getInvites(@Args('projectId') projectId: string) {
    return await this.teamService.getInvites(projectId);
  }

  @Query(() => [UserOnProject])
  @RequirePermission({ capability: Capability.TeamRead, scope: ScopeKind.Project })
  async getTeamMembers(@Args('projectId') projectId: string) {
    return this.teamService.getTeamMembers(projectId);
  }

  @Query(() => Invite, { nullable: true })
  @Public()
  async getInvite(@Args('inviteId') inviteId: string) {
    return this.teamService.getInvite(inviteId);
  }

  @Mutation(() => Boolean)
  @RequirePermission({ capability: Capability.TeamManage, scope: ScopeKind.Project })
  @UseGuards(EmailConfigGuard)
  async inviteTeamMember(@UserEntity() user: User, @Args('data') data: InviteTeamMemberInput) {
    this.logger.log(`Inviting team member: ${user.id}`);
    await this.teamService.inviteTeamMember(
      user.id,
      data.email.toLowerCase(),
      data.projectId,
      data.name,
      data.role as Role,
    );
    return true;
  }

  @Mutation(() => Boolean)
  @RequirePermission({ capability: Capability.TeamManage, scope: ScopeKind.Project })
  async removeTeamMember(@Args('data') data: RemoveTeamMemberInput) {
    await this.teamService.removeTeamMember(data.userId, data.projectId);
    return true;
  }

  @Mutation(() => Boolean)
  @RequirePermission({ capability: Capability.TeamManage, scope: ScopeKind.Project })
  async changeTeamMemberRole(@Args('data') data: ChangeTeamMemberRoleInput) {
    await this.teamService.changeTeamMemberRole(data.userId, data.projectId, data.role);
    return true;
  }

  @Mutation(() => Boolean)
  @RequirePermission({ capability: Capability.TeamManage, scope: ScopeKind.Project })
  async cancelInvite(@Args('data') data: CancelInviteInput) {
    await this.teamService.cancelInvite(data.projectId, data.inviteId);
    return true;
  }

  @Mutation(() => Boolean)
  @RequirePermission({ capability: Capability.ProjectActivate, scope: ScopeKind.Project })
  async activeUserProject(@Args('data') data: ActiveUserProjectInput) {
    await this.teamService.activeUserProject(data.userId, data.projectId);
    return true;
  }
}
