import { ArgsType, Field } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

@ArgsType()
export class AnalyticsIdArgs {
  @Field()
  @IsNotEmpty()
  contentId: string;

  @Field()
  startDate: string;

  @Field()
  endDate: string;

  @Field()
  timezone: string;

  @Field()
  environmentId: string;
}
