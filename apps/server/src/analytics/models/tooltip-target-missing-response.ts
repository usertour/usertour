import { Field, Int, ObjectType } from '@nestjs/graphql';
import { BizSessionConnection } from './analytics-connection.model';

@ObjectType()
export class StepAnalytics {
  @Field(() => Int)
  uniqueViews: number;

  @Field(() => Int)
  totalViews: number;

  @Field(() => Int)
  uniqueTooltipTargetMissingCount: number;

  @Field(() => Int)
  tooltipTargetMissingCount: number;
}

@ObjectType()
export class TooltipTargetMissingResponse {
  @Field(() => BizSessionConnection)
  sessions: BizSessionConnection;

  @Field(() => StepAnalytics)
  stepAnalytics: StepAnalytics;
}
