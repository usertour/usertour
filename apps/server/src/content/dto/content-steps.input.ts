import { Field, InputType } from '@nestjs/graphql';
import { JsonValue } from '@prisma/client/runtime/library';
import GraphQLJSON from 'graphql-type-json';
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

  // Optional version data payload — lets addContentSteps double as the unified
  // "save the whole version" mutation (steps + themeId + data in one
  // round-trip). Omitted by callers that only touch steps. config is NOT here:
  // autostart/hide rules are the detail page's domain, never the builder's.
  @Field(() => GraphQLJSON, { nullable: true })
  data?: JsonValue;
}
