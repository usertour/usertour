import { Field, InputType } from '@nestjs/graphql';
import { IsString } from 'class-validator';

@InputType()
export class WebhookIdInput {
  @Field(() => String)
  @IsString()
  id: string;
}
