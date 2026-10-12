import { Field, InputType } from '@nestjs/graphql';
import type {
  SyncLocalObject as SyncLocalObjectValue,
  SyncMatchStrategy as SyncMatchStrategyValue,
  SyncRemoteObject as SyncRemoteObjectValue,
} from '@usertour/types';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { SyncLocalObject } from '../types/sync-local-object.type';
import { SyncMatchStrategy } from '../types/sync-match-strategy.type';
import { SyncRemoteObject } from '../types/sync-remote-object.type';
import { SyncInboundFieldInput } from './sync-inbound-field.input';
import { SyncOutboundFieldInput } from './sync-outbound-field.input';

@InputType()
export class UpsertIntegrationObjectMappingInput {
  @Field(() => String)
  @IsString()
  integrationId: string;

  @Field(() => SyncRemoteObject)
  remoteObject: SyncRemoteObjectValue;

  @Field(() => SyncLocalObject)
  localObject: SyncLocalObjectValue;

  @Field(() => SyncMatchStrategy)
  matchStrategy: SyncMatchStrategyValue;

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
