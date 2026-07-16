import { Field, ObjectType } from '@nestjs/graphql';
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

  /** Subscribed topics: "*" | "event.tracked" | "event.tracked.<codeName>". */
  @Field(() => GraphQLJSON)
  topics: string[];

  @Field(() => Boolean)
  enabled: boolean;

  @Field(() => String)
  secret: string;

  @Field(() => String, { nullable: true })
  description?: string | null;
}
