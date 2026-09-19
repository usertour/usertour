import { InputType, OmitType } from '@nestjs/graphql';

import type { NewLocalization } from '../types/new-localization.type';
import { LocalizationDTO } from './localization.dto';

@InputType()
export class CreateLocalizationInput
  extends OmitType(LocalizationDTO, ['id', 'createdAt', 'updatedAt', 'isDefault'], InputType)
  implements NewLocalization {}
