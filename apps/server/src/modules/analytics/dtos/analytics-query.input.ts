import { Field, InputType } from '@nestjs/graphql';

import type { AnalyticsFilter } from '../types/analytics-filter.type';

@InputType()
export class AnalyticsQuery implements AnalyticsFilter {
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
}
