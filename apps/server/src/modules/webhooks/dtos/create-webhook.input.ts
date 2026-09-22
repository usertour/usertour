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

import type { NewWebhook } from '../types/new-webhook.type';
import { MAX_TOPIC_SUBSCRIPTIONS } from '../utils/webhook-topics.util';

@InputType()
export class CreateWebhookInput implements NewWebhook {
  @Field(() => String)
  @IsString()
  environmentId: string;

  /**
   * Shape check only (http/https, hostname allowed without a TLD — intranet
   * hosts are legal when the deployment permits private egress). Whether
   * non-HTTPS / private targets are ACCEPTED is decided by the service's
   * assertPublicHttpUrl, which honors ALLOW_PRIVATE_NETWORK_EGRESS.
   */
  @Field(() => String)
  @MaxLength(2083)
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true, require_tld: false })
  url: string;

  @Field(() => [String])
  @IsArray()
  @ArrayMaxSize(MAX_TOPIC_SUBSCRIPTIONS)
  @MaxLength(200, { each: true })
  @IsString({ each: true })
  topics: string[];

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
