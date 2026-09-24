import { Field, Int, ObjectType } from '@nestjs/graphql';

/** GraphQL projection of one delivery attempt (read side, detail page log). */
@ObjectType('WebhookDelivery')
export class WebhookDeliveryDTO {
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
