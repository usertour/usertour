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
  planType: string;
}
