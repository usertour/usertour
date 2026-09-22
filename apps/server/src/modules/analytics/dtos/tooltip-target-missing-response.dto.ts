import { Field, ObjectType } from '@nestjs/graphql';

import { BizSessionConnectionDTO } from './biz-session-connection.dto';
import { StepAnalyticsDTO } from './step-analytics.dto';

@ObjectType('TooltipTargetMissingResponse')
export class TooltipTargetMissingResponseDTO {
  @Field(() => BizSessionConnectionDTO)
  sessions: BizSessionConnectionDTO;

  @Field(() => StepAnalyticsDTO)
  stepAnalytics: StepAnalyticsDTO;
}
