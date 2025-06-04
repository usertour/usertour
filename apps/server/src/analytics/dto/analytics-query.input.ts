import { Field, InputType } from '@nestjs/graphql';

@InputType()
export class AnalyticsQuery {
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
