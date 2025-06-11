import { Field, InputType } from '@nestjs/graphql';
import { JsonValue } from '@prisma/client/runtime/library';
import GraphQLJSON from 'graphql-type-json';

@InputType()
export class VersionInput {
  @Field({ nullable: true })
  themeId?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  config?: JsonValue;

  @Field(() => GraphQLJSON, { nullable: true })
  data?: JsonValue;
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

  @Field(() => GraphQLJSON)
  localized: JsonValue;

  @Field(() => GraphQLJSON)
  backup: JsonValue;
}
