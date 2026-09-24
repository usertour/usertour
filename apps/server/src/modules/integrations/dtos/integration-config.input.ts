import { Field, InputType } from '@nestjs/graphql';
import { IsIn, IsOptional } from 'class-validator';

@InputType()
export class IntegrationConfigInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsIn(['US', 'EU'])
  region?: 'US' | 'EU';
}
