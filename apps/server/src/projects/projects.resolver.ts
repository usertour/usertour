import {
  Resolver,
  Query,
  Parent,
  Mutation,
  Args,
  ResolveField,
} from "@nestjs/graphql";
import { UserEntity } from "@/common/decorators/user.decorator";
import { ProjectsService } from "./projects.service";
import { Project } from "./models/project.model";
import { UserOnProject } from "./models/useronproject.model";
import { User } from "@/users/models/user.model";
import { CreateProjectInput } from "./dto/createProject.input";

@Resolver(() => Project)
export class ProjectsResolver {
  constructor(private projectsService: ProjectsService) { }

  // @Mutation(() => Project)
  // async createProject(
  //   @UserEntity() user: User,
  //   @Args("data") newData: CreateProjectInput
  // ) {
  //   return this.projectsService.createProject(user.id, newData);
  // }

}
