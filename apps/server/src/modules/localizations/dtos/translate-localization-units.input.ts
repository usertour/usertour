import { Field, InputType } from '@nestjs/graphql';

import type { MachineTranslationRequest } from '../types/machine-translation-request.type';
import { TranslationUnitInput } from './translation-unit.input';

@InputType()
export class TranslateLocalizationUnitsInput implements MachineTranslationRequest {
  @Field(() => String)
  versionId: string;

  @Field(() => String)
  localizationId: string;

  @Field(() => [TranslationUnitInput])
  units: TranslationUnitInput[];
}
