import { Field, InputType } from '@nestjs/graphql';
import { JsonValue } from '@prisma/client/runtime/library';
import { IsNotEmpty } from 'class-validator';
import GraphQLJSON from 'graphql-type-json';

import type { NewContent } from '../types/new-content.type';
import { StepInput } from './step.input';

@InputType()
export class ContentInput implements NewContent {
  @Field(() => String, { nullable: false })
  type: string;

  @Field({ nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  buildUrl?: string;

  @Field({ nullable: true })
  @IsNotEmpty()
  environmentId?: string;

  @Field({ nullable: true })
  themeId?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  config?: JsonValue;

  @Field(() => GraphQLJSON, { nullable: true })
  data?: JsonValue;

  @Field(() => [StepInput], { nullable: true })
  steps?: [StepInput];
}
