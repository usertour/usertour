import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, MinLength } from 'class-validator';

@InputType()
export class SignupInput {
  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  code: string;

  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  userName: string;

  @Field(() => String, { nullable: true })
  companyName?: string;

  @Field(() => Boolean, { nullable: false })
  isInvite: boolean;
}
