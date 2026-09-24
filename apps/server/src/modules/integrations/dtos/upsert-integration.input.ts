import { Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

import type { IntegrationUpsert } from '../types/integration-upsert.type';
import { IntegrationConfigInput } from './integration-config.input';

@InputType()
export class UpsertIntegrationInput implements IntegrationUpsert {
  @Field(() => String)
  @IsString()
  environmentId: string;

  /** Validated against INTEGRATION_PROVIDERS in the service. */
  @Field(() => String)
  @IsString()
  @MaxLength(50)
  provider: string;

  /**
   * Provider API key. Required on first configure; omitted on later writes to
   * keep the stored key (it is never echoed back, so "unchanged" must be
   * expressible as absence).
   */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  key?: string;

  @Field(() => IntegrationConfigInput, { nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => IntegrationConfigInput)
  config?: IntegrationConfigInput;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
