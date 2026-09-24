import { Field, ObjectType } from '@nestjs/graphql';
import { JsonValue } from '@prisma/client/runtime/library';
import GraphQLJSON from 'graphql-type-json';

@ObjectType('QuestionAnalytics')
export class QuestionAnalyticsDTO {
  @Field(() => GraphQLJSON, { nullable: true })
  analytics: JsonValue;
}
