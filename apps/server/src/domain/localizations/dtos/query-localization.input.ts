import { ArgsType, PickType } from '@nestjs/graphql';

import { Localization } from './localization.dto';

@ArgsType()
export class QueryLocalizationInput extends PickType(Localization, ['projectId'], ArgsType) {}
