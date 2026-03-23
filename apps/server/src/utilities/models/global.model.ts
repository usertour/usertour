import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class GlobalConfig {
  @Field(() => Boolean)
  isSelfHostedMode: boolean;

  @Field(() => String, { nullable: true })
  apiUrl: string;

  @Field(() => Boolean)
  allowUserRegistration: boolean;

  @Field(() => Boolean)
  allowProjectLevelSubscriptionManagement: boolean;

  @Field(() => Boolean)
  needsSystemAdminSetup: boolean;

  @Field(() => [String])
  authProviders: string[];
}
