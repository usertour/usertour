import { Field, InputType } from '@nestjs/graphql';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

import type { WebhookChanges } from '../types/webhook-changes.type';
import { MAX_TOPIC_SUBSCRIPTIONS } from '../utils/webhook-topics.util';

@InputType()
export class UpdateWebhookInput implements WebhookChanges {
  @Field(() => String)
  @IsString()
  id: string;

  /** Same contract as CreateWebhookInput.url. */
  @Field(() => String, { nullable: true })
  @IsOptional()
  @MaxLength(2083)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  url?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_TOPIC_SUBSCRIPTIONS)
  @MaxLength(200, { each: true })
  @IsString({ each: true })
  topics?: string[];

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}
