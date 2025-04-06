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
import { TeamGuard } from './team.guard';
import { RolesScopeEnum } from '@/common/decorators/roles.decorator';
import { Roles } from '@/common/decorators/roles.decorator';

@Resolver()
@UseGuards(TeamGuard)
export class TeamResolver {
  private readonly logger = new Logger(TeamResolver.name);
  constructor(private teamService: TeamService) {}

  @Query(() => [Invite])
  @Roles([RolesScopeEnum.OWNER])
  async getInvites(@Args('projectId') projectId: string) {
    return await this.teamService.getInvites(projectId);
  }

  @Query(() => [UserOnProject])
  @Roles([RolesScopeEnum.OWNER])
  async getTeamMembers(@Args('projectId') projectId: string) {
    return this.teamService.getTeamMembers(projectId);
  }

  @Query(() => Invite)
  @Public()
  async getInvite(@Args('inviteId') inviteId: string) {
    return this.teamService.getInvite(inviteId);
  }

  @Mutation(() => Boolean)
  @Roles([RolesScopeEnum.OWNER])
  async inviteTeamMember(@UserEntity() user: User, @Args('data') data: InviteTeamMemberInput) {
    this.logger.log(`Inviting team member: ${user.id}`);
    await this.teamService.inviteTeamMember(
      user.id,
      data.email,
      data.projectId,
      data.name,
      data.role as Role,
    );
    return true;
  }

  @Mutation(() => Boolean)
  @Roles([RolesScopeEnum.OWNER])
  async removeTeamMember(@Args('data') data: RemoveTeamMemberInput) {
    await this.teamService.removeTeamMember(data.userId, data.projectId);
    return true;
  }

  @Mutation(() => Boolean)
  @Roles([RolesScopeEnum.OWNER])
  async changeTeamMemberRole(@Args('data') data: ChangeTeamMemberRoleInput) {
    await this.teamService.changeTeamMemberRole(data.userId, data.projectId, data.role);
    return true;
  }

  @Mutation(() => Boolean)
  @Roles([RolesScopeEnum.OWNER])
  async cancelInvite(@Args('data') data: CancelInviteInput) {
    await this.teamService.cancelInvite(data.inviteId);
    return true;
  }

  @Mutation(() => Boolean)
  @Roles([RolesScopeEnum.OWNER, RolesScopeEnum.ADMIN, RolesScopeEnum.VIEWER])
  async activeUserProject(@Args('data') data: ActiveUserProjectInput) {
    await this.teamService.activeUserProject(data.userId, data.projectId);
    return true;
  }
}
