import { IsEmail } from "class-validator";
import { InputType, Field } from "@nestjs/graphql";

@InputType()
export class MagicLinkInput {
  @Field()
  @IsEmail()
  email: string;
}
