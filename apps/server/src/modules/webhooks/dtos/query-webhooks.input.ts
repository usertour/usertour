import { ArgsType, Field } from '@nestjs/graphql';
import { IsString } from 'class-validator';

@ArgsType()
export class QueryWebhooksInput {
  @Field(() => String)
  @IsString()
  environmentId: string;
}
