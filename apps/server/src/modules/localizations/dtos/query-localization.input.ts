import { ArgsType, PickType } from '@nestjs/graphql';

import { LocalizationDTO } from './localization.dto';

@ArgsType()
export class QueryLocalizationInput extends PickType(LocalizationDTO, ['projectId'], ArgsType) {}
