import { Field, InputType, OmitType, PartialType } from '@nestjs/graphql';

import type { LocalizationChanges } from '../types/localization-changes.type';
import { LocalizationDTO } from './localization.dto';

@InputType()
export class UpdateLocalizationInput
  extends PartialType(
    OmitType(LocalizationDTO, ['projectId', 'createdAt', 'updatedAt', 'isDefault']),
    InputType,
  )
  implements LocalizationChanges
{
  @Field(() => String)
  id: string;
}
