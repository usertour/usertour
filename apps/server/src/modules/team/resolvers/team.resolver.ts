import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UserDTO } from '@/modules/users/dtos/user.dto';
import { ActiveUserProjectInput } from '../dtos/active-user-project.input';
import { CancelInviteInput } from '../dtos/cancel-invite.input';
import { ChangeTeamMemberRoleInput } from '../dtos/change-team-member-role.input';
import { InviteTeamMemberInput } from '../dtos/invite-team-member.input';
import { RemoveTeamMemberInput } from '../dtos/remove-team-member.input';
import { TransferProjectOwnershipInput } from '../dtos/transfer-project-ownership.input';
import { UserOnProjectDTO } from '../dtos/user-on-project.dto';
import { TeamService } from '../services/team.service';
import { UserEntity } from '@/modules/auth/decorators/user.decorator';
import { Role } from '@prisma/client';
import { Logger } from '@nestjs/common';
import { InviteDTO } from '../dtos/invite.dto';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { UseGuards } from '@nestjs/common';
import { EmailConfigGuard } from '@/modules/common/guards/email-config.guard';
import { PermissionGuard } from '@/modules/auth/permission/permission.guard';
import { RequirePermission } from '@/modules/auth/permission/require-permission.decorator';
import { ScopeKind } from '@/modules/auth/permission/scope-resolver.registry';
import { AuditWeb } from '@/modules/audit/decorators/audit.decorator';
import { Capability } from '@usertour/types';

@Resolver()
@UseGuards(PermissionGuard)
export class TeamResolver {
  private readonly logger = new Logger(TeamResolver.name);
  constructor(private teamService: TeamService) {}

  @Query(() => [InviteDTO])
  @RequirePermission({ capability: Capability.TeamRead, scope: ScopeKind.Project })
  async getInvites(@Args('projectId') projectId: string) {
    return await this.teamService.getInvites(projectId);
  }

  @Query(() => [UserOnProjectDTO])
  @RequirePermission({ capability: Capability.TeamRead, scope: ScopeKind.Project })
  async getTeamMembers(@Args('projectId') projectId: string) {
    return this.teamService.getTeamMembers(projectId);
  }

  @Query(() => InviteDTO, { nullable: true })
  @Public()
  async getInvite(@Args('inviteId') inviteId: string) {
    return this.teamService.getInvite(inviteId);
  }

  @Mutation(() => Boolean)
  @RequirePermission({ capability: Capability.TeamManage, scope: ScopeKind.Project })
  @AuditWeb({
    action: 'create',
    resourceType: 'member',
    resourceId: (a) => (a.data as { email: string }).email,
  })
  @UseGuards(EmailConfigGuard)
  async inviteTeamMember(@UserEntity() user: UserDTO, @Args('data') data: InviteTeamMemberInput) {
    this.logger.log(`Inviting team member: ${user.id}`);
    await this.teamService.inviteTeamMember(
      user.id,
      data.email.toLowerCase(),
      data.projectId,
      data.name,
      data.role as Role,
      data.allowedEnvironmentIds,
    );
    return true;
  }

  @Mutation(() => Boolean)
  @RequirePermission({ capability: Capability.TeamManage, scope: ScopeKind.Project })
  @AuditWeb({
    action: 'delete',
    resourceType: 'member',
    resourceId: (a) => (a.data as { userId: string }).userId,
  })
  async removeTeamMember(@Args('data') data: RemoveTeamMemberInput) {
    await this.teamService.removeTeamMember(data.userId, data.projectId);
    return true;
  }

  @Mutation(() => Boolean)
  @RequirePermission({ capability: Capability.TeamManage, scope: ScopeKind.Project })
  @AuditWeb({
    action: 'update',
    resourceType: 'member',
    resourceId: (a) => (a.data as { userId: string }).userId,
  })
  async changeTeamMemberRole(@Args('data') data: ChangeTeamMemberRoleInput) {
    await this.teamService.changeTeamMemberRole(
      data.userId,
      data.projectId,
      data.role,
      data.allowedEnvironmentIds,
    );
    return true;
  }

  @Mutation(() => Boolean)
  @RequirePermission({ capability: Capability.TeamTransferOwnership, scope: ScopeKind.Project })
  @AuditWeb({
    action: 'update',
    resourceType: 'member',
    resourceId: (a) => (a.data as { userId: string }).userId,
  })
  async transferProjectOwnership(@Args('data') data: TransferProjectOwnershipInput) {
    await this.teamService.transferOwnership(data.projectId, data.userId);
    return true;
  }

  @Mutation(() => Boolean)
  @RequirePermission({ capability: Capability.TeamManage, scope: ScopeKind.Project })
  @AuditWeb({
    action: 'delete',
    resourceType: 'member',
    resourceId: (a) => (a.data as { inviteId: string }).inviteId,
  })
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
