import { Field, InputType, OmitType, PartialType } from '@nestjs/graphql';

import type { ThemeChanges } from '../types/theme-changes.type';
import { CreateThemeInput } from './create-theme.input';

// A patch. `skipNullProperties: false` makes a field that is left out skip
// validation but a field sent as null go through CreateThemeInput's checks,
// so a null for a non-nullable column is rejected rather than handed to the
// database.
@InputType()
export class UpdateThemeInput
  extends PartialType(OmitType(CreateThemeInput, ['projectId']), {
    decorator: InputType,
    skipNullProperties: false,
  })
  implements ThemeChanges
{
  @Field(() => String)
  id: string;
}
