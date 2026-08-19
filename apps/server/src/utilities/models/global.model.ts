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

  @Field(() => Boolean)
  machineTranslationEnabled: boolean;

  /**
   * ALLOW_PRIVATE_NETWORK_EGRESS: outbound targets (webhooks, SSO discovery)
   * may be private / non-HTTPS. The web mirrors it to relax the HTTPS-only
   * hint on webhook URLs — the server enforces either way.
   */
  @Field(() => Boolean)
  allowPrivateNetworkEgress: boolean;

  @Field(() => [String])
  authProviders: string[];
}
