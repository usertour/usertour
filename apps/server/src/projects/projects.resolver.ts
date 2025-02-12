import { Resolver } from '@nestjs/graphql';
import { Project } from './models/project.model';
import { ProjectsService } from './projects.service';

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
}
