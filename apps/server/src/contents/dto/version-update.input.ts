import { IsNotEmpty } from "class-validator";
import { InputType, Field } from "@nestjs/graphql";
import { VersionInput } from "./version.input";

@InputType()
export class VersionUpdateInput {
  @Field({ nullable: true })
  @IsNotEmpty()
  versionId: string;

  @Field(() => VersionInput)
  content: VersionInput;
}
