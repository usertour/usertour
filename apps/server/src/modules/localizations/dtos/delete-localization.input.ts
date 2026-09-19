import { InputType, PickType } from '@nestjs/graphql';

import { LocalizationDTO } from './localization.dto';

@InputType()
export class DeleteLocalizationInput extends PickType(LocalizationDTO, ['id'], InputType) {}
