import { Field, Int, ObjectType } from "@nestjs/graphql";
import { BaseModel } from "@/common/models/base.model";
import GraphQLJSON from "graphql-type-json";
import { JsonValue } from "@prisma/client/runtime/library";

@ObjectType()
export class Analytics {
  @Field(() => Int)
  uniqueViews: Number;

  @Field(() => Int)
  totalViews: Number;

  @Field(() => Int)
  uniqueCompletions: Number;

  @Field(() => Int)
  totalCompletions: Number;

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
