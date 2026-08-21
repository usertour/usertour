import { Field, Int, ObjectType } from '@nestjs/graphql';
import GraphQLJSON from 'graphql-type-json';

/**
 * GraphQL projection of a Webhook row. `secret` is a queryable field, but the
 * web list query deliberately doesn't select it — it is surfaced on the detail
 * page only (both capabilities are owner-only, so this is exposure hygiene,
 * not a permission boundary).
 */
@ObjectType()
export class Webhook {
  @Field(() => String)
  id: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  @Field(() => String)
  environmentId: string;

  @Field(() => String)
  url: string;

  /** Subscribed topics: "*", a family prefix ("event.tracked", "content", "user", "company"), or an exact topic. */
  @Field(() => GraphQLJSON)
  topics: string[];

  @Field(() => Boolean)
  enabled: boolean;

  // Nullable: list/delete rows carry NULL (masked — those surfaces never
  // need the secret). '' only ever comes from the decrypt path and means
  // "stored value is no longer decryptable". Two meanings, two values.
  @Field(() => String, { nullable: true })
  secret: string | null;

  @Field(() => String, { nullable: true })
  description?: string | null;

  /** Circuit-breaker streak: consecutive failed delivery attempts (any success resets). */
  @Field(() => Int)
  consecutiveFailures: number;

  /** While in the future, delivery is paused for this endpoint (cooldown). */
  @Field(() => Date, { nullable: true })
  cooldownUntil?: Date | null;

  /** Set when the SYSTEM disabled the endpoint after sustained failure. */
  @Field(() => Date, { nullable: true })
  autoDisabledAt?: Date | null;
}
