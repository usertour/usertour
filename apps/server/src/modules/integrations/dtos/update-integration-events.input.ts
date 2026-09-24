import { Field, InputType } from '@nestjs/graphql';
import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

import type { IntegrationEventsChanges } from '../types/integration-events-changes.type';

/** Timeline events of a sync provider (ADR 0013 §8): the switch and the selected milestone set. */
@InputType()
export class UpdateIntegrationEventsInput implements IntegrationEventsChanges {
  @Field(() => String)
  @IsString()
  id: string;

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  /** Event codeNames to send; validated against SYNC_TIMELINE_EVENTS in the service. */
  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  codeNames?: string[];
}
