import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, MaxLength, MinLength } from 'class-validator';

@InputType()
export class SignupInput {
  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  code: string;

  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(160)
  password: string;

  @Field(() => String, { nullable: false })
  @IsNotEmpty()
  @MaxLength(80)
  userName: string;

  @Field(() => String, { nullable: true })
  @MaxLength(80)
  companyName?: string;

  @Field(() => Boolean, { nullable: false })
  isInvite: boolean;
}
