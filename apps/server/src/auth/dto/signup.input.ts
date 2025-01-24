import { IsEmail, IsNotEmpty, MinLength } from "class-validator";
import { InputType, Field } from "@nestjs/graphql";

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
