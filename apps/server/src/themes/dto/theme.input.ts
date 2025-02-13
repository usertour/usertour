import { Field, InputType, OmitType, PartialType, PickType } from '@nestjs/graphql';
import { JsonValue } from '@prisma/client/runtime/library';
import GraphQLJSON from 'graphql-type-json';
import { Theme } from '../models/theme.model';

@InputType()
export class CreateThemeInput {
  @Field()
  name: string;

  @Field(() => Boolean)
  isDefault: boolean;

  @Field(() => String)
  projectId: string;

  @Field(() => GraphQLJSON, { nullable: true })
  settings: JsonValue;
}

@InputType()
export class UpdateThemeInput extends PartialType(
  OmitType(CreateThemeInput, ['projectId']),
  InputType,
) {
  @Field(() => String)
  id: string;
}

@InputType()
export class CopyThemeInput {
  @Field(() => String)
  id: string;
  @Field(() => String)
  name?: string;
}

@InputType()
export class DeleteThemeInput extends PartialType(PickType(CopyThemeInput, ['id']), InputType) {}

@InputType()
export class InitThemeInput extends OmitType(
  Theme,
  ['id', 'createdAt', 'updatedAt', 'projectId'],
  InputType,
) {}
