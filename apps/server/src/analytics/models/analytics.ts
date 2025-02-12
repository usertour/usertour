import { Field, Int, ObjectType } from '@nestjs/graphql';
import { JsonValue } from '@prisma/client/runtime/library';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class Analytics {
  @Field(() => Int)
  uniqueViews: number;

  @Field(() => Int)
  totalViews: number;

  @Field(() => Int)
  uniqueCompletions: number;

  @Field(() => Int)
  totalCompletions: number;

  @Field(() => GraphQLJSON, { nullable: true })
  viewsByDay: JsonValue;

  // @Field(() => GraphQLJSON, { nullable: true })
  // totalViewsByDay: JsonValue;

  // @Field(() => GraphQLJSON, { nullable: true })
  // uniqueCompletionByDay: JsonValue;

  // @Field(() => GraphQLJSON, { nullable: true })
  // totalCompletionByDay: JsonValue;

  @Field(() => GraphQLJSON, { nullable: true })
  viewsByStep: JsonValue;

  @Field(() => GraphQLJSON, { nullable: true })
  viewsByTask: JsonValue;
}
