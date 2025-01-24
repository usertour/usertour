import { IsEmail } from "class-validator";
import { InputType, Field } from "@nestjs/graphql";

@InputType()
export class ResetPasswordInput {
  @Field()
  @IsEmail()
  email: string;
}
