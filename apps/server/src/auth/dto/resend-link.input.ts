import { IsNotEmpty } from "class-validator";
import { InputType, Field } from "@nestjs/graphql";

@InputType()
export class ResendLinkInput {
  @Field()
  @IsNotEmpty()
  id: string;
}
