import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('StepAnalytics')
export class StepAnalyticsDTO {
  @Field(() => Int)
  uniqueViews: number;

  @Field(() => Int)
  totalViews: number;

  @Field(() => Int)
  uniqueCompletions: number;

  @Field(() => Int)
  totalCompletions: number;

  @Field(() => Int)
  uniqueTooltipTargetMissingCount: number;

  @Field(() => Int)
  tooltipTargetMissingCount: number;
}
