import { ArgsType, Field, InputType, OmitType, PartialType, PickType } from '@nestjs/graphql';
import { Attribute } from '../models/attribute.model';

@InputType()
export class CreateAttributeInput extends OmitType(
  Attribute,
  ['id', 'createdAt', 'updatedAt', 'predefined'],
  InputType,
) {}

@InputType()
export class UpdateAttributeInput extends PartialType(
  OmitType(Attribute, ['projectId', 'createdAt', 'updatedAt', 'predefined']),
  InputType,
) {
  @Field(() => String)
  id: string;
}

@InputType()
export class DeleteAttributeInput extends PickType(Attribute, ['id'], InputType) {}

@ArgsType()
export class QueryAttributeInput extends PickType(Attribute, ['projectId', 'bizType'], ArgsType) {}
