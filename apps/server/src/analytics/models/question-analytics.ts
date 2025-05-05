import { Field, ObjectType } from '@nestjs/graphql';
import { JsonValue } from '@prisma/client/runtime/library';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class QuestionAnalytics {
  @Field(() => GraphQLJSON, { nullable: true })
  analytics: JsonValue;
}
