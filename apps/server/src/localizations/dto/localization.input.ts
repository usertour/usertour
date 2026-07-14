import { ArgsType, Field, InputType, OmitType, PartialType, PickType } from '@nestjs/graphql';
import { Localization } from '../models/localization.model';

@InputType()
export class CreateLocalizationInput extends OmitType(
  Localization,
  ['id', 'createdAt', 'updatedAt', 'isDefault'],
  InputType,
) {}

@InputType()
export class UpdateLocalizationInput extends PartialType(
  OmitType(Localization, ['projectId', 'createdAt', 'updatedAt', 'isDefault']),
  InputType,
) {
  @Field(() => String)
  id: string;
}

@InputType()
export class DeleteLocalizationInput extends PickType(Localization, ['id'], InputType) {}

@ArgsType()
export class QueryLocalizationInput extends PickType(Localization, ['projectId'], ArgsType) {}

@InputType()
export class TranslationUnitInput {
  @Field(() => String)
  path: string;

  @Field(() => String)
  sourceText: string;
}

@InputType()
export class TranslateLocalizationUnitsInput {
  @Field(() => String)
  versionId: string;

  @Field(() => String)
  localizationId: string;

  @Field(() => [TranslationUnitInput])
  units: TranslationUnitInput[];
}
