import { UserEntity } from '@/modules/auth/decorators/user.decorator';
import { SkipTwoFactorEnrollment } from '@/modules/auth/decorators/skip-2fa-enrollment.decorator';
import { Args, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { PrismaService } from 'nestjs-prisma';
import { ChangeEmailInput } from './dtos/change-email.input';
import { ChangePasswordInput } from './dtos/change-password.input';
import { CreateOwnedProjectInput } from './dtos/create-owned-project.input';
import { UpdateUserInput } from './dtos/update-user.input';
import { UserDTO } from './dtos/user.dto';
import { UsersService } from './services/users.service';
import { AuthService } from '@/modules/auth/services/auth.service';
import { TwoFactorService } from '@/modules/auth/services/two-factor.service';
import { ProjectDTO } from '@/modules/projects/dtos/project.dto';
@Resolver(() => UserDTO)
export class UsersResolver {
  constructor(
    private usersService: UsersService,
    private prisma: PrismaService,
    private authService: AuthService,
    private twoFactorService: TwoFactorService,
  ) {}

  @Query(() => UserDTO)
  @SkipTwoFactorEnrollment()
  async me(@UserEntity() user: UserDTO): Promise<UserDTO> {
    return user;
  }

  @Mutation(() => UserDTO)
  async updateUser(@UserEntity() user: UserDTO, @Args('data') newUserData: UpdateUserInput) {
    return this.usersService.updateUser(user.id, newUserData);
  }

  @Mutation(() => UserDTO)
  async changePassword(
    @UserEntity() user: UserDTO,
    @Args('data') changePassword: ChangePasswordInput,
  ) {
    return this.usersService.changePassword(user.id, user.password, changePassword);
  }

  @Mutation(() => UserDTO)
  async changeEmail(@UserEntity() user: UserDTO, @Args('data') input: ChangeEmailInput) {
    return this.usersService.changeEmail(user.id, user.password, input);
  }

  // Self-serve project creation for stranded users (zero project memberships).
  // The service-level guard enforces the "only when 0 projects" rule; the
  // frontend only surfaces the entry from /select-project's empty state.
  @Mutation(() => ProjectDTO)
  async createOwnedProject(
    @UserEntity() user: UserDTO,
    @Args('data') input: CreateOwnedProjectInput,
  ) {
    return this.authService.createOwnedProject(user.id, input.name);
  }

  @ResolveField('projects')
  async projects(@Parent() author: UserDTO) {
    return this.prisma.user
      .findUnique({ where: { id: author.id } })
      .projects({ include: { project: true } });
  }

  @ResolveField('isOAuthUser')
  async isOAuthUser(@Parent() author: UserDTO) {
    return await this.usersService.isOAuthUser(author.id);
  }

  @ResolveField('twoFactorAvailable')
  async twoFactorAvailable(@Parent() author: UserDTO) {
    return this.twoFactorService.isTwoFactorAvailableForUser(author.id);
  }
}
