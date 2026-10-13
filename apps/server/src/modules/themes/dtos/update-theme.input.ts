import { Field, InputType, OmitType, PartialType } from '@nestjs/graphql';
import { JsonValue } from '@prisma/client/runtime/library';
import { IsBoolean, IsObject, IsString, ValidateIf } from 'class-validator';

import type { ThemeChanges } from '../types/theme-changes.type';
import { CreateThemeInput } from './create-theme.input';
import { ThemeSettingsScalar } from './theme-settings.scalar';

@InputType()
export class UpdateThemeInput
  extends PartialType(
    OmitType(CreateThemeInput, ['projectId', 'name', 'isDefault', 'settings']),
    InputType,
  )
  implements ThemeChanges
{
  @Field(() => String)
  id: string;

  // Declared here rather than picked: PartialType marks a picked field
  // optional in a way that also skips null, and these columns are not
  // nullable, so an explicit null is rejected rather than handed to the
  // database.
  @Field(() => String, { nullable: true })
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  name?: string;

  @Field(() => Boolean, { nullable: true })
  @ValidateIf((_, value) => value !== undefined)
  @IsBoolean()
  isDefault?: boolean;

  @Field(() => ThemeSettingsScalar, { nullable: true })
  @ValidateIf((_, value) => value !== undefined)
  @IsObject()
  settings?: JsonValue;
}
