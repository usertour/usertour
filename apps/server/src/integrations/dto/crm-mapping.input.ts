import { ArgsType, Field, InputType } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

@InputType()
export class CrmInboundFieldInput {
  /** Provider property name. */
  @Field(() => String)
  @IsString()
  @MaxLength(200)
  remote: string;

  /** Usertour attribute code name (validated as a codeName in the service). */
  @Field(() => String)
  @IsString()
  @MaxLength(100)
  local: string;
}

@InputType()
export class CrmOutboundFieldInput {
  /** Usertour attribute code name; the provider property name is assigned server-side. */
  @Field(() => String)
  @IsString()
  @MaxLength(100)
  local: string;
}

@InputType()
export class UpsertIntegrationObjectMappingInput {
  @Field(() => String)
  @IsString()
  integrationId: string;

  @Field(() => String)
  @IsIn(['contact', 'company'])
  remoteObject: string;

  @Field(() => String)
  @IsIn(['user', 'company'])
  localObject: string;

  @Field(() => String)
  @IsIn(['email', 'remoteField'])
  matchStrategy: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  matchRemoteField?: string | null;

  @Field(() => [CrmInboundFieldInput])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrmInboundFieldInput)
  inboundFields: CrmInboundFieldInput[];

  @Field(() => [CrmOutboundFieldInput])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CrmOutboundFieldInput)
  outboundFields: CrmOutboundFieldInput[];

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  /** Confirm taking over existing internal attributes named in inboundFields. */
  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  adoptExisting?: boolean;
}

/** Mapping-keyed operations carry the integration id so scope resolves from it. */
@InputType()
export class IntegrationObjectMappingIdInput {
  @Field(() => String)
  @IsString()
  integrationId: string;

  @Field(() => String)
  @IsString()
  id: string;
}

@ArgsType()
export class ListCrmRemotePropertiesArgs {
  @Field(() => String)
  @IsString()
  integrationId: string;

  @Field(() => String)
  @IsIn(['contact', 'company'])
  remoteObject: string;
}
