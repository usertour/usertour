import { Field, InputType } from '@nestjs/graphql';
import { IsString } from 'class-validator';

@InputType()
export class IntegrationIdInput {
  @Field(() => String)
  @IsString()
  id: string;
}
