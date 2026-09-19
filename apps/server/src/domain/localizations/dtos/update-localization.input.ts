import { Field, InputType, OmitType, PartialType } from '@nestjs/graphql';

import type { LocalizationChanges } from '../types/localization-changes.type';
import { Localization } from './localization.dto';

@InputType()
export class UpdateLocalizationInput
  extends PartialType(
    OmitType(Localization, ['projectId', 'createdAt', 'updatedAt', 'isDefault']),
    InputType,
  )
  implements LocalizationChanges
{
  @Field(() => String)
  id: string;
}
