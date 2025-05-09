import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';
import { StepInput } from './step.input';

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
  @Field(() => [StepInput])
  steps: StepInput[];
}
