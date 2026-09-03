import { ArgsType, Field, InputType, OmitType, PartialType, PickType } from '@nestjs/graphql';
import { Attribute } from '../models/attribute.model';

@InputType()
// `source` / `sourceId` are ownership markers written only by the CRM mapping
// service (ADR 0013 §6) — never through the generic attribute mutations.
export class CreateAttributeInput extends OmitType(
  Attribute,
  ['id', 'createdAt', 'updatedAt', 'predefined', 'description', 'source', 'sourceId'],
  InputType,
) {
  // The model declares description non-null (the column defaults to ''),
  // but creation may omit it and take the default.
  @Field(() => String, { nullable: true })
  description?: string;
}

@InputType()
export class UpdateAttributeInput extends PartialType(
  OmitType(Attribute, ['projectId', 'createdAt', 'updatedAt', 'predefined', 'source', 'sourceId']),
  InputType,
) {
  @Field(() => String)
  id: string;
}

@InputType()
export class DeleteAttributeInput extends PickType(Attribute, ['id'], InputType) {}

@ArgsType()
export class QueryAttributeInput extends PickType(Attribute, ['projectId', 'bizType'], ArgsType) {}
