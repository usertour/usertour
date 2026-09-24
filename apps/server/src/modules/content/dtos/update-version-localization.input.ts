import { Field, InputType } from '@nestjs/graphql';

import { VersionTranslationUnitInput } from './version-translation-unit.input';

@InputType()
export class UpdateVersionLocalizationInput {
  @Field(() => String)
  contentId: string;

  @Field(() => String)
  versionId: string;

  /** The target locale's code. */
  @Field(() => String)
  code: string;

  // Only the units listed are written; every other unit keeps its stored
  // translation, so two editors of one locale merge instead of overwriting
  // each other.
  @Field(() => [VersionTranslationUnitInput], { nullable: true })
  translations?: VersionTranslationUnitInput[];

  // Omitted keeps the stored state.
  @Field(() => Boolean, { nullable: true })
  enabled?: boolean;
}
