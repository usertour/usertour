import { InputType, PickType } from '@nestjs/graphql';

import { Localization } from './localization.dto';

@InputType()
export class DeleteLocalizationInput extends PickType(Localization, ['id'], InputType) {}
