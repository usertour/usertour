import { Field, Int, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';
import PaginatedResponse from '@/common/pagination/pagination';

/** GraphQL projection of one delivery attempt (read side, detail page log). */
@ObjectType()
export class WebhookDelivery {
  @Field(() => String)
  id: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Int)
  attempt: number;

  @Field(() => Boolean)
  success: boolean;

  @Field(() => Int, { nullable: true })
  responseStatus?: number | null;

  /** Response body excerpt (truncated server-side). */
  @Field(() => String, { nullable: true })
  responseBody?: string | null;

  @Field(() => String, { nullable: true })
  error?: string | null;

  @Field(() => Int, { nullable: true })
  durationMs?: number | null;
}

/**
 * GraphQL projection of an outbound message addressed to a webhook, with its
 * attempts. `id` is the public message id (payload `id`, receiver idempotency
 * key); `payload` is the body exactly as sent.
 */
@ObjectType()
export class WebhookMessage {
  @Field(() => String)
  id: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => String)
  topic: string;

  /** PENDING | DELIVERED | FAILED */
  @Field(() => String)
  status: string;

  @Field(() => GraphQLJSON)
  payload: unknown;

  @Field(() => [WebhookDelivery])
  deliveries: WebhookDelivery[];
}

@ObjectType()
export class WebhookMessageConnection extends PaginatedResponse(WebhookMessage) {}
