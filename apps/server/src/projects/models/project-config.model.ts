import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class ProjectConfigModel {
  @Field()
  removeBranding: boolean;

  @Field()
  customCss: boolean;

  @Field()
  auditLogs: boolean;

  /** Audit log read window: -1 = unlimited, 0 = none, N = last N days. */
  @Field(() => Int)
  auditLogRetentionDays: number;

  @Field()
  ssoOidc: boolean;

  @Field()
  ssoSaml: boolean;

  /** Outbound webhooks: cloud Starter+, self-hosted always on. */
  @Field()
  webhooks: boolean;

  /** Outbound integrations: same gate shape as webhooks. */
  @Field()
  integrations: boolean;

  /** CRM sync (ADR 0013): cloud Growth+, self-hosted always on. */
  @Field()
  crmIntegrations: boolean;

  @Field()
  planType: string;
}
