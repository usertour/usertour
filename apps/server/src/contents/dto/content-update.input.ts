import { IsNotEmpty } from "class-validator";
import { InputType, Field, PartialType, PickType } from "@nestjs/graphql";
import { ContentInput } from "./content.input";

@InputType()
export class UpdateContentInput extends PartialType(
  PickType(ContentInput, ["name", "buildUrl"]),
  InputType
) {}

@InputType()
export class ContentUpdateInput {
  @Field()
  @IsNotEmpty()
  contentId: string;

  @Field(() => UpdateContentInput, { nullable: false })
  content: UpdateContentInput;
}

@InputType()
export class ContentDuplicateInput extends PartialType(
  PickType(ContentInput, ["name"]),
  InputType
) {
  @Field()
  @IsNotEmpty()
  contentId: string;
}

@InputType()
export class ContentIdInput {
  @Field()
  @IsNotEmpty()
  contentId: string;
}
