import { InputType, Field } from "@nestjs/graphql";
import { IsNotEmpty, MinLength } from "class-validator";

@InputType()
export class ResetPasswordByCodeInput {
  @Field()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @Field()
  @IsNotEmpty()
  code: string;
}
