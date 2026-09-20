import { Field, InputType } from '@nestjs/graphql';
import { JsonValue } from '@prisma/client/runtime/library';
import GraphQLJSON from 'graphql-type-json';
import { StepInput } from './step.input';

@InputType()
export class VersionInput {
  @Field({ nullable: true })
  themeId?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  config?: JsonValue;

  @Field(() => GraphQLJSON, { nullable: true })
  data?: JsonValue;

  @Field(() => Date, { nullable: true })
  scheduledAt?: Date;

  // Optional. When present, the whole step list is upserted by cvid
  // (create / update / delete + resequence) — the builder's save path.
  // detail omits it and only touches the scalar fields above.
  @Field(() => [StepInput], { nullable: true })
  steps?: StepInput[];
}

@InputType()
export class VersionIdInput {
  @Field({ nullable: true })
  versionId?: string;

  @Field(() => String, { nullable: true })
  environmentId?: string;
}

@InputType()
export class VersionTranslationUnitInput {
  @Field(() => String)
  path: string;

  // null clears the unit; a blank string keeps the stored translation.
  @Field(() => String, { nullable: true })
  translation?: string | null;
}

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
