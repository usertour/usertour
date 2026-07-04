import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class GlobalConfig {
  @Field(() => Boolean)
  isSelfHostedMode: boolean;

  @Field(() => String, { nullable: true })
  apiUrl: string;

  /** Full public MCP endpoint (Settings -> MCP shows it verbatim). */
  @Field(() => String, { nullable: true })
  mcpServerUrl: string;

  @Field(() => String, { nullable: true })
  ssoCallbackUrl: string;

  @Field(() => Boolean)
  allowUserRegistration: boolean;

  @Field(() => Boolean)
  allowProjectLevelSubscriptionManagement: boolean;

  @Field(() => Boolean)
  needsSystemAdminSetup: boolean;

  @Field(() => Boolean)
  require2FA: boolean;

  @Field(() => [String])
  authProviders: string[];
}
