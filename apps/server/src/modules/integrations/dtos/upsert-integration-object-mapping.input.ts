import { Field, InputType } from '@nestjs/graphql';
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

import { SyncInboundFieldInput } from './sync-inbound-field.input';
import { SyncOutboundFieldInput } from './sync-outbound-field.input';

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

  @Field(() => [SyncInboundFieldInput])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncInboundFieldInput)
  inboundFields: SyncInboundFieldInput[];

  @Field(() => [SyncOutboundFieldInput])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SyncOutboundFieldInput)
  outboundFields: SyncOutboundFieldInput[];

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
