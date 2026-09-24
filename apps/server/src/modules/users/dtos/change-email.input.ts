import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, MinLength } from 'class-validator';

import type { EmailChange } from '../types/email-change.type';

@InputType()
export class ChangeEmailInput implements EmailChange {
  @Field()
  @IsNotEmpty()
  email: string;

  @Field()
  @IsNotEmpty()
  @MinLength(8)
  password: string;
}
