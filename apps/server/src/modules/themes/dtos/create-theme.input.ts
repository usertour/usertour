import { Field, InputType } from '@nestjs/graphql';
import { JsonValue } from '@prisma/client/runtime/library';
import { IsArray, IsBoolean, IsObject, IsString, ValidateIf } from 'class-validator';

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

  // May be omitted; when sent it is the array, never null — no writer clears
  // variations, and the REST schema takes an array only.
  @Field(() => [ThemeVariationScalar], { nullable: true })
  @ValidateIf((_, value) => value !== undefined)
  @IsArray()
  variations?: JsonValue;
}
