import { Field, InputType } from '@nestjs/graphql';
import type { IntegrationRegion as IntegrationRegionValue } from '@usertour/types';
import { IsOptional } from 'class-validator';

import { IntegrationRegion } from '../types/integration-region.type';

@InputType()
export class IntegrationConfigInput {
  @Field(() => IntegrationRegion, { nullable: true })
  @IsOptional()
  region?: IntegrationRegionValue;
}
