import { BaseModel } from '@/common/models/base.model';
import { UserOnProjectDTO } from '@/modules/team/dtos/user-on-project.dto';
import { Field, HideField, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Role } from '@prisma/client';
import { IsEmail } from 'class-validator';
import 'reflect-metadata';

registerEnumType(Role, {
  name: 'Role',
  description: 'User role',
});

@ObjectType('User')
export class UserDTO extends BaseModel {
  @Field()
  @IsEmail()
  email: string;

  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  avatarUrl?: string;

  // Not every user read resolves project memberships — explicitly nullable
  // so the contract can't drift with toolchain nullability inference.
  @Field(() => [UserOnProjectDTO], { nullable: true })
  projects?: [UserOnProjectDTO];

  @HideField()
  password: string;

  @Field(() => Boolean, { nullable: true })
  isOAuthUser?: boolean;

  @Field(() => Boolean)
  isSystemAdmin: boolean;

  @Field(() => Boolean)
  disabled: boolean;

  @Field(() => Boolean)
  twoFactorEnabled: boolean;

  /**
   * Whether this user is entitled to use 2FA on the current instance. SaaS:
   * always true. Self-host: true iff the instance license OR any of the user's
   * project licenses include the 2FA feature. Resolved via @ResolveField,
   * therefore optional on the source object.
   */
  @Field(() => Boolean, { nullable: true })
  twoFactorAvailable?: boolean;
}
