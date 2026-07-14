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
export class VersionUpdateLocalizationInput {
  @Field(() => String)
  versionId: string;

  @Field(() => String)
  localizationId: string;

  @Field(() => Boolean)
  enabled: boolean;

  // Optional so state-only writes (the enable toggle) don't have to echo a
  // payload back — resending a possibly stale copy is how translations get
  // clobbered. Omitted fields keep their stored value.
  @Field(() => GraphQLJSON, { nullable: true })
  localized?: JsonValue;

  @Field(() => GraphQLJSON, { nullable: true })
  backup?: JsonValue;
}
