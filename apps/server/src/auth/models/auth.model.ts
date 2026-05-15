import { User } from '@/users/models/user.model';
import { Field, ObjectType } from '@nestjs/graphql';
import { GraphQLJWT } from 'graphql-scalars';

@ObjectType()
export class Auth {
  @Field(() => GraphQLJWT, { nullable: true, description: 'JWT access token' })
  accessToken?: string;

  @Field(() => GraphQLJWT, { nullable: true, description: 'JWT refresh token' })
  refreshToken?: string;

  @Field(() => String, { nullable: true })
  redirectUrl?: string;

  @Field(() => String, { nullable: true })
  projectId?: string;

  @Field(() => User, { nullable: true })
  user?: User;

  /**
   * True when the user has 2FA enabled and must complete verification before tokens are issued.
   * `twoFactorChallenge` carries the short-lived token to pass into `verifyTwoFactor`.
   */
  @Field(() => Boolean)
  requiresTwoFactor: boolean;

  /**
   * True when instance enforces 2FA and the user hasn't set it up yet; client should redirect
   * to the setup flow and pass `twoFactorChallenge` into `confirmTwoFactorSetup`.
   */
  @Field(() => Boolean)
  requiresTwoFactorSetup: boolean;

  @Field(() => String, { nullable: true })
  twoFactorChallenge?: string;
}
