import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Project } from './models/project.model';
import { ProjectsService } from './projects.service';
import { UserEntity } from '@/common/decorators/user.decorator';
import { User } from '@/users/models/user.model';
import { ProjectsGuard } from './projects.guard';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesScopeEnum } from '@/common/decorators/roles.decorator';

@Resolver(() => Project)
export class ProjectsResolver {
  constructor(private projectsService: ProjectsService) {}

  // @Mutation(() => Project)
  // async createProject(
  //   @UserEntity() user: User,
  //   @Args("data") newData: CreateProjectInput
  // ) {
  //   return this.projectsService.createProject(user.id, newData);
  // }

  @Mutation(() => Project)
  @UseGuards(ProjectsGuard)
  @Roles([RolesScopeEnum.OWNER])
  async updateProjectName(
    @UserEntity() user: User,
    @Args('projectId') projectId: string,
    @Args('name') name: string,
  ) {
    return this.projectsService.updateProjectName(user.id, projectId, name);
  }
}
