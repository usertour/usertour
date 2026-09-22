import { Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

import type { IntegrationInboundChanges } from '../types/integration-inbound-changes.type';

@InputType()
export class UpdateIntegrationInboundInput implements IntegrationInboundChanges {
  @Field(() => String)
  @IsString()
  id: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  /** Empty string clears the override (back to distinct_id matching). */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  userIdProperty?: string;
}
