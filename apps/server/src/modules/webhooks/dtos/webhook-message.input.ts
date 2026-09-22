import { Field, InputType } from '@nestjs/graphql';
import { IsString } from 'class-validator';

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
