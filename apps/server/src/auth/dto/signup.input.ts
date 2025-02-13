import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, MinLength } from 'class-validator';

@InputType()
export class SignupInput {
  @Field()
  @IsNotEmpty()
  code: string;

  @Field()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @Field()
  @IsNotEmpty()
  userName: string;

  @Field()
  @IsNotEmpty()
  companyName: string;
}
