import { Field, Int, ObjectType } from '@nestjs/graphql';
import PaginatedResponse from '@/common/pagination/pagination';

/** GraphQL projection of one delivery attempt (read side, detail page log). */
@ObjectType()
export class WebhookDelivery {
  @Field(() => String)
  id: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => String)
  webhookId: string;

  /** Stable across retries of the same message (receiver idempotency key). */
  @Field(() => String)
  messageId: string;

  @Field(() => String)
  topic: string;

  @Field(() => Int)
  attempt: number;

  @Field(() => Boolean)
  success: boolean;

  @Field(() => Int, { nullable: true })
  responseStatus?: number | null;

  @Field(() => String, { nullable: true })
  error?: string | null;

  @Field(() => Int, { nullable: true })
  durationMs?: number | null;
}

@ObjectType()
export class WebhookDeliveryConnection extends PaginatedResponse(WebhookDelivery) {}
