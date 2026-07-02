import { Field, Int, ObjectType } from '@nestjs/graphql';

import PaginatedResponse from '@/common/pagination/pagination';

/**
 * One publish / unpublish event for the per-content "Publish history" panel.
 * Names (`actorName` / `actorTokenName` / `environmentName`) are enriched at
 * read time — the stored row keeps only ids, which outlive users / tokens /
 * environments.
 */
@ObjectType()
export class ContentPublishRecord {
  @Field(() => String)
  id: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => String)
  contentId: string;

  @Field(() => String)
  versionId: string;

  /** Denormalized version number ("v3") — survives version deletion. */
  @Field(() => Int)
  versionSequence: number;

  @Field(() => String)
  environmentId: string;

  @Field(() => String, { nullable: true })
  environmentName?: string | null;

  /** publish | unpublish */
  @Field(() => String)
  action: string;

  @Field(() => String, { nullable: true })
  actorUserId?: string | null;

  @Field(() => String, { nullable: true })
  actorTokenId?: string | null;

  /**
   * Display name of who acted: the web user's name, or — for a key/agent write —
   * the key OWNER's name (pair with `actorTokenName` for "by X · via CI key").
   * Null for records predating actor capture (the migration backfill).
   */
  @Field(() => String, { nullable: true })
  actorName?: string | null;

  /** The API key / connected app name when the actor was a token. */
  @Field(() => String, { nullable: true })
  actorTokenName?: string | null;
}

@ObjectType()
export class ContentPublishRecordConnection extends PaginatedResponse(ContentPublishRecord) {}
