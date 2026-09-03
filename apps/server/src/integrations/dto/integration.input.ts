import { ArgsType, Field, InputType } from '@nestjs/graphql';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

@ArgsType()
export class QueryIntegrationsInput {
  @Field(() => String)
  @IsString()
  environmentId: string;
}

@InputType()
export class IntegrationConfigInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsIn(['US', 'EU'])
  region?: 'US' | 'EU';
}

@InputType()
export class UpsertIntegrationInput {
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

@InputType()
export class UpdateIntegrationInboundInput {
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

@InputType()
export class IntegrationIdInput {
  @Field(() => String)
  @IsString()
  id: string;
}

@InputType()
export class StartCrmOAuthInput {
  @Field(() => String)
  @IsString()
  environmentId: string;

  /** Validated against CRM_INTEGRATION_PROVIDERS in the service. */
  @Field(() => String)
  @IsString()
  @MaxLength(50)
  provider: string;
}
