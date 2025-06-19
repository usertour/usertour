import { Field, InputType } from '@nestjs/graphql';
import { JsonValue } from '@prisma/client/runtime/library';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsObject,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class UpdateIntegrationInput {
  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  key?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  config?: JsonValue;
}

export enum MixpanelWebhookAction {
  MEMBERS = 'members',
  ADD_MEMBERS = 'add_members',
  REMOVE_MEMBERS = 'remove_members',
}

export class MixpanelMemberDto {
  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  mixpanel_distinct_id?: string;

  // Allow any additional properties
  [key: string]: any;
}

export class MixpanelPageInfoDto {
  @IsString()
  total_pages: string;

  @IsString()
  page_count: string;
}

export class MixpanelParametersDto {
  @IsString()
  mixpanel_project_id: string;

  @IsString()
  mixpanel_cohort_name: string;

  @IsString()
  mixpanel_cohort_id: string;

  @IsString()
  @IsOptional()
  mixpanel_cohort_description?: string;

  @IsString()
  @IsOptional()
  mixpanel_session_id?: string;

  @IsObject()
  @IsOptional()
  page_info?: MixpanelPageInfoDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MixpanelMemberDto)
  members: MixpanelMemberDto[];
}

export class MixpanelWebhookDto {
  @IsEnum(MixpanelWebhookAction)
  action: MixpanelWebhookAction;

  @IsObject()
  @ValidateNested()
  @Type(() => MixpanelParametersDto)
  parameters: MixpanelParametersDto;
}

export class IntegrationOAuthDto {
  /// Provider (e.g., "salesforce", "hubspot")
  provider: string;
  /// Provider account ID
  providerAccountId: string;
  /// Access token
  accessToken: string;
  /// Refresh token
  refreshToken: string;
  /// Expires at
  expiresAt: Date;
  /// Scope
  scope: string;
}

export class CreateIntegrationOAuthInput {
  /// Provider (e.g., "salesforce", "hubspot")
  provider: string;
  /// Provider account ID
  providerAccountId: string;
  /// Access token
  accessToken: string;
  /// Refresh token
  refreshToken: string;
  /// Expires at
  expiresAt: Date;
  /// Scope
  scope: string;
}

export class UpdateIntegrationOAuthInput {
  /// Access token
  accessToken?: string;
  /// Refresh token
  refreshToken?: string;
  /// Expires at
  expiresAt?: Date;
  /// Scope
  scope?: string;
}

@InputType()
export class UpdateIntegrationObjectMappingInput {
  /// Mapping settings
  @Field(() => GraphQLJSON, { nullable: true })
  settings?: JsonValue;
  /// Whether the mapping is enabled
  @Field(() => Boolean, { nullable: true })
  enabled?: boolean;
}

@InputType()
export class CreateIntegrationObjectMappingInput {
  /// Source object type (e.g., "Contact", "Account")
  @Field(() => String)
  sourceObjectType: string;
  /// Destination object type (e.g., "BizUser", "BizCompany")
  @Field(() => String)
  destinationObjectType: string;
  /// Mapping settings
  @Field(() => GraphQLJSON, { nullable: true })
  settings?: JsonValue;
  /// Whether the mapping is enabled
  @Field(() => Boolean, { nullable: true })
  enabled?: boolean;
}
