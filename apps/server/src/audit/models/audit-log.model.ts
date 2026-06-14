import { Field, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

/** GraphQL projection of an AuditLog row (read side, for the web admin Activity page). */
@ObjectType()
export class AuditLog {
  @Field(() => String)
  id: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => String)
  projectId: string;

  @Field(() => String, { nullable: true })
  environmentId?: string | null;

  /** 'api' | 'mcp' (and later 'web' | 'system'). */
  @Field(() => String)
  source: string;

  /** The human, when known (null for env access-token / system writes). */
  @Field(() => String, { nullable: true })
  actorUserId?: string | null;

  /** The credential used (ApiToken.id, or v1 AccessToken.id). */
  @Field(() => String, { nullable: true })
  actorTokenId?: string | null;

  /** Resolved at read time (best-effort): the actor's name/email; null if the user was deleted. */
  @Field(() => String, { nullable: true })
  actorUserName?: string | null;

  /** Resolved at read time (best-effort): the token's name; null if the token was deleted. */
  @Field(() => String, { nullable: true })
  actorTokenName?: string | null;

  /** 'create' | 'update' | 'delete'. */
  @Field(() => String)
  action: string;

  /** Exact tool / route, e.g. `delete_segment` or `DELETE /v2/.../themes/:id`. */
  @Field(() => String)
  operation: string;

  @Field(() => String)
  resourceType: string;

  @Field(() => String)
  resourceId: string;

  /** Resolved at read time (best-effort): the resource's name/title from the snapshot. */
  @Field(() => String, { nullable: true })
  resourceName?: string | null;

  @Field(() => GraphQLJSON, { nullable: true })
  before?: unknown;

  @Field(() => GraphQLJSON, { nullable: true })
  after?: unknown;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: unknown;
}
