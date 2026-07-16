import { ArgsType, Field, InputType } from '@nestjs/graphql';
import { IsArray, IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';

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

  @Field(() => String)
  @IsUrl({ protocols: ['https'], require_protocol: true })
  url: string;

  @Field(() => [String])
  @IsArray()
  @IsString({ each: true })
  topics: string[];

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;
}

@InputType()
export class UpdateWebhookInput {
  @Field(() => String)
  @IsString()
  id: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  url?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  topics?: string[];

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  description?: string;
}

@InputType()
export class WebhookIdInput {
  @Field(() => String)
  @IsString()
  id: string;
}
