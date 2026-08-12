import { Field, InputType } from '@nestjs/graphql';

/** Optional filters for the audit-log list query (project is a separate arg). */
@InputType()
export class AuditLogQuery {
  @Field(() => String, { nullable: true })
  resourceType?: string;

  @Field(() => String, { nullable: true })
  resourceId?: string;

  @Field(() => String, { nullable: true })
  action?: string;

  @Field(() => String, { nullable: true })
  source?: string;

  @Field(() => String, { nullable: true })
  environmentId?: string;

  @Field(() => String, { nullable: true })
  actorUserId?: string;

  /** Inclusive lower bound on createdAt (merged with the plan retention window). */
  @Field(() => Date, { nullable: true })
  createdAtFrom?: Date;

  /** Inclusive upper bound on createdAt. */
  @Field(() => Date, { nullable: true })
  createdAtTo?: Date;
}
