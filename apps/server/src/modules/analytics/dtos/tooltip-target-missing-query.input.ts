import { Field, InputType } from '@nestjs/graphql';

import type { TooltipTargetMissingFilter } from '../types/tooltip-target-missing-filter.type';

@InputType()
export class TooltipTargetMissingQuery implements TooltipTargetMissingFilter {
  @Field(() => String, { nullable: false })
  contentId: string;

  @Field(() => String, { nullable: false })
  startDate: string;

  @Field(() => String, { nullable: false })
  endDate: string;

  @Field(() => String, { nullable: false })
  timezone: string;

  @Field(() => String, { nullable: false })
  environmentId: string;

  @Field(() => String, { nullable: false })
  stepCvid: string;
}
