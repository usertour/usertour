import { Field, InputType } from '@nestjs/graphql';
import { JsonValue } from '@prisma/client/runtime/library';
import GraphQLJSON from 'graphql-type-json';

import type { NewTheme } from '../types/new-theme.type';

@InputType()
export class CreateThemeInput implements NewTheme {
  @Field()
  name: string;

  @Field(() => Boolean)
  isDefault: boolean;

  @Field(() => String)
  projectId: string;

  @Field(() => GraphQLJSON, { nullable: true })
  settings: JsonValue;

  @Field(() => GraphQLJSON, { nullable: true })
  variations?: JsonValue;
}
