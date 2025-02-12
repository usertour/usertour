import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';

@InputType()
export class ResendLinkInput {
  @Field()
  @IsNotEmpty()
  id: string;
}
