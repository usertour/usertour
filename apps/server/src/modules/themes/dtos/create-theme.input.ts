import { Field, InputType } from '@nestjs/graphql';
import { JsonValue } from '@prisma/client/runtime/library';
import { IsBoolean, IsObject, IsString } from 'class-validator';

import type { NewTheme } from '../types/new-theme.type';
import { ThemeSettingsScalar } from './theme-settings.scalar';
import { ThemeVariationScalar } from './theme-variation.scalar';

@InputType()
export class CreateThemeInput implements NewTheme {
  @Field()
  @IsString()
  name: string;

  @Field(() => Boolean)
  @IsBoolean()
  isDefault: boolean;

  @Field(() => String)
  projectId: string;

  // Required: the column is non-null, and a JSON null would pass the database
  // only to fail the non-null output field.
  @Field(() => ThemeSettingsScalar)
  @IsObject()
  settings: JsonValue;

  @Field(() => [ThemeVariationScalar], { nullable: true })
  variations?: JsonValue;
}
