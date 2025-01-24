import { IsNotEmpty } from "class-validator";
import { InputType, Field } from "@nestjs/graphql";
import { StepInput } from "./step.input";

@InputType()
export class ContentStepsInput {
  @Field()
  @IsNotEmpty()
  contentId: string;

  @Field()
  @IsNotEmpty()
  versionId: string;

  @Field()
  @IsNotEmpty()
  themeId: string;

  @IsNotEmpty()
  @Field((type) => [StepInput])
  steps: StepInput[];
}
