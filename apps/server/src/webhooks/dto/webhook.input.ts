import { ArgsType, Field, InputType } from '@nestjs/graphql';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

import { MAX_TOPIC_SUBSCRIPTIONS } from '../webhook-topics';

@ArgsType()
export class QueryWebhooksInput {
  @Field(() => String)
  @IsString()
  environmentId: string;
}

@InputType()
export class CreateWebhookInput {
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

@InputType()
export class UpdateWebhookInput {
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

@InputType()
export class WebhookIdInput {
  @Field(() => String)
  @IsString()
  id: string;
}

@InputType()
export class WebhookMessageInput {
  /** The endpoint the message belongs to — resolves the permission scope. */
  @Field(() => String)
  @IsString()
  webhookId: string;

  @Field(() => String)
  @IsString()
  messageId: string;
}
