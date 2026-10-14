import { Field, InputType } from '@nestjs/graphql';
import { JsonValue } from '@prisma/client/runtime/library';
import { IsNotEmpty, IsString, ValidateIf } from 'class-validator';
import GraphQLJSON from 'graphql-type-json';

import type { NewContent } from '../types/new-content.type';
import { StepInput } from './step.input';
import { ContentTypeScalar } from './content-type.scalar';
import { VersionConfigScalar } from './version-config.scalar';

@InputType()
export class ContentInput implements NewContent {
  @Field(() => ContentTypeScalar)
  type: string;

  // The model's name is non-null (the column defaults to ''); creation may
  // omit it, but an explicit null is rejected rather than handed to the
  // database. UpdateContentInput inherits the rule through PartialType with
  // `skipNullProperties: false`.
  @Field({ nullable: true })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  name?: string;

  @Field(() => String, { nullable: true })
  buildUrl?: string;

  @Field({ nullable: true })
  @IsNotEmpty()
  environmentId?: string;

  @Field({ nullable: true })
  themeId?: string;

  // The first version's config: createContent writes it to the version row.
  @Field(() => VersionConfigScalar, { nullable: true })
  config?: JsonValue;

  @Field(() => GraphQLJSON, { nullable: true })
  data?: JsonValue;

  @Field(() => [StepInput], { nullable: true })
  steps?: [StepInput];
}
