import { PrismaService } from "nestjs-prisma";
import {
  Resolver,
  Query,
  Parent,
  Mutation,
  Args,
  ResolveField,
} from "@nestjs/graphql";
import { UserEntity } from "@/common/decorators/user.decorator";
import { UsersService } from "./users.service";
import { User } from "./models/user.model";
import { ChangePasswordInput } from "./dto/change-password.input";
import { UpdateUserInput } from "./dto/update-user.input";
import { ChangeEmailInput } from "./dto/change-email.input";

@Resolver(() => User)
export class UsersResolver {
  constructor(
    private usersService: UsersService,
    private prisma: PrismaService
  ) {}

  @Query(() => User)
  async me(@UserEntity() user: User): Promise<User> {
    return user;
  }

  @Mutation(() => User)
  async updateUser(
    @UserEntity() user: User,
    @Args("data") newUserData: UpdateUserInput
  ) {
    return this.usersService.updateUser(user.id, newUserData);
  }

  @Mutation(() => User)
  async changePassword(
    @UserEntity() user: User,
    @Args("data") changePassword: ChangePasswordInput
  ) {
    return this.usersService.changePassword(
      user.id,
      user.password,
      changePassword
    );
  }

  @Mutation(() => User)
  async changeEmail(
    @UserEntity() user: User,
    @Args("data") input: ChangeEmailInput
  ) {
    return this.usersService.changeEmail(user.id, user.password, input);
  }

  @ResolveField("projects")
  projects(@Parent() author: User) {
    return this.prisma.user
      .findUnique({ where: { id: author.id } })
      .projects({ include: { project: true } });
  }
}
