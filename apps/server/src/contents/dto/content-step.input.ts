import { IsNotEmpty } from "class-validator";
import { InputType, Field } from "@nestjs/graphql";
import { StepInput } from "./step.input";

@InputType()
export class ContentStepInput {
  @Field()
  @IsNotEmpty()
  stepId: string;

  @Field(() => StepInput)
  @IsNotEmpty()
  step: StepInput;
}
