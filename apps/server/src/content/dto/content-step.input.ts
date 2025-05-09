import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';
import { StepInput } from './step.input';

@InputType()
export class ContentStepInput {
  @Field()
  @IsNotEmpty()
  stepId: string;

  @Field(() => StepInput)
  @IsNotEmpty()
  step: StepInput;
}
