import { Field, InputType, OmitType, PartialType } from '@nestjs/graphql';

import type { ThemeChanges } from '../types/theme-changes.type';
import { CreateThemeInput } from './create-theme.input';

@InputType()
export class UpdateThemeInput
  extends PartialType(OmitType(CreateThemeInput, ['projectId']), InputType)
  implements ThemeChanges
{
  @Field(() => String)
  id: string;
}
