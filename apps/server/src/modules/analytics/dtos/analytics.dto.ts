import { Field, Int, ObjectType } from '@nestjs/graphql';
import { JsonValue } from '@prisma/client/runtime/library';

import { AnalyticsViewsByBlockScalar } from './analytics-views-by-block.scalar';
import { AnalyticsViewsByButtonScalar } from './analytics-views-by-button.scalar';
import { AnalyticsViewsByDayScalar } from './analytics-views-by-day.scalar';
import { AnalyticsViewsByStepScalar } from './analytics-views-by-step.scalar';
import { AnalyticsViewsByTaskScalar } from './analytics-views-by-task.scalar';

@ObjectType('Analytics')
export class AnalyticsDTO {
  @Field(() => Int)
  uniqueViews: number;

  @Field(() => Int)
  totalViews: number;

  @Field(() => Int)
  uniqueCompletions: number;

  @Field(() => Int)
  totalCompletions: number;

  @Field(() => [AnalyticsViewsByDayScalar], { nullable: true })
  viewsByDay: JsonValue;

  // @Field(() => GraphQLJSON, { nullable: true })
  // totalViewsByDay: JsonValue;

  // @Field(() => GraphQLJSON, { nullable: true })
  // uniqueCompletionByDay: JsonValue;

  // @Field(() => GraphQLJSON, { nullable: true })
  // totalCompletionByDay: JsonValue;

  @Field(() => [AnalyticsViewsByStepScalar], { nullable: true })
  viewsByStep: JsonValue;

  @Field(() => [AnalyticsViewsByTaskScalar], { nullable: true })
  viewsByTask: JsonValue;

  @Field(() => [AnalyticsViewsByBlockScalar], { nullable: true })
  viewsByBlock: JsonValue;

  @Field(() => [AnalyticsViewsByButtonScalar], { nullable: true })
  viewsByButton: JsonValue;

  // Embed only: dismissal is its own counter, not its "complete"
  @Field(() => Int, { nullable: true })
  uniqueDismissals?: number;
}
