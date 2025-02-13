import { Field, InputType } from '@nestjs/graphql';
import { IsEmail } from 'class-validator';

@InputType()
export class MagicLinkInput {
  @Field()
  @IsEmail()
  email: string;
}
