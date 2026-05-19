import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, MaxLength, MinLength } from 'class-validator';

@InputType()
export class ResetPasswordByCodeInput {
  @Field()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(160)
  password: string;

  @Field()
  @IsNotEmpty()
  code: string;
}
