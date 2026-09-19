import { InputType, OmitType } from '@nestjs/graphql';

import type { NewLocalization } from '../types/new-localization.type';
import { Localization } from './localization.dto';

@InputType()
export class CreateLocalizationInput
  extends OmitType(Localization, ['id', 'createdAt', 'updatedAt', 'isDefault'], InputType)
  implements NewLocalization {}
