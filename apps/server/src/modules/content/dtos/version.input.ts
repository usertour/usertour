import { Field, InputType } from '@nestjs/graphql';
import { JsonValue } from '@prisma/client/runtime/library';
import GraphQLJSON from 'graphql-type-json';

import type { VersionDraft } from '../types/version-draft.type';
import { StepInput } from './step.input';

@InputType()
export class VersionInput implements VersionDraft {
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
