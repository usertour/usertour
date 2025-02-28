import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { User } from '@/users/models/user.model';
import { TeamService } from './team.service';
import { UserOnProject } from './models/useronproject.model';
import {
  CancelInviteInput,
  ChangeTeamMemberRoleInput,
  InviteTeamMemberInput,
  RemoveTeamMemberInput,
} from './dto/member.input';
import { UserEntity } from '@/common/decorators/user.decorator';
import { Role } from '@prisma/client';
import { Logger } from '@nestjs/common';
import { Invite } from './models/invite.model';

@Resolver()
export class TeamResolver {
  private readonly logger = new Logger(TeamResolver.name);
  constructor(private teamService: TeamService) {}

  @Query(() => [Invite])
  async getInvites(@Args('projectId') projectId: string) {
    return await this.teamService.getInvites(projectId);
  }

  @Query(() => [UserOnProject])
  async getTeamMembers(@Args('projectId') projectId: string) {
    return this.teamService.getTeamMembers(projectId);
  }

  @Mutation(() => Boolean)
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
  async removeTeamMember(@Args('data') data: RemoveTeamMemberInput) {
    await this.teamService.removeTeamMember(data.userId, data.projectId);
    return true;
  }

  @Mutation(() => Boolean)
  async changeTeamMemberRole(@Args('data') data: ChangeTeamMemberRoleInput) {
    await this.teamService.changeTeamMemberRole(data.userId, data.projectId, data.role);
    return true;
  }

  @Mutation(() => Boolean)
  async cancelInvite(@Args('data') data: CancelInviteInput) {
    await this.teamService.cancelInvite(data.inviteId);
    return true;
  }
}
