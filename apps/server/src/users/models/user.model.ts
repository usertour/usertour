import { BaseModel } from '@/common/models/base.model';
import { UserOnProject } from '@/team/models/useronproject.model';
import { Field, HideField, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Role } from '@prisma/client';
import { IsEmail } from 'class-validator';
import 'reflect-metadata';

registerEnumType(Role, {
  name: 'Role',
  description: 'User role',
});

@ObjectType()
export class User extends BaseModel {
  @Field()
  @IsEmail()
  email: string;

  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  avatarUrl?: string;

  @Field(() => [UserOnProject])
  projects?: [UserOnProject];

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
