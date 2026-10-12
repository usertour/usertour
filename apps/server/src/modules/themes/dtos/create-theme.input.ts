import { Field, InputType } from '@nestjs/graphql';
import { JsonValue } from '@prisma/client/runtime/library';

import type { NewTheme } from '../types/new-theme.type';
import { ThemeSettingsScalar } from './theme-settings.scalar';
import { ThemeVariationScalar } from './theme-variation.scalar';

@InputType()
export class CreateThemeInput implements NewTheme {
  @Field()
  name: string;

  @Field(() => Boolean)
  isDefault: boolean;

  @Field(() => String)
  projectId: string;

  @Field(() => ThemeSettingsScalar, { nullable: true })
  settings: JsonValue;

  @Field(() => [ThemeVariationScalar], { nullable: true })
  variations?: JsonValue;
}
