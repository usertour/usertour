import { IsNotEmpty } from "class-validator";
import { InputType, Field } from "@nestjs/graphql";

@InputType()
export class CreateProjectInput {
  @Field()
  @IsNotEmpty()
  name: string;

  @Field({ nullable: true })
  logoUrl?: string;
}
