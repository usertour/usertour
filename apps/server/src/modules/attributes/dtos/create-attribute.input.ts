import { Field, InputType, Int, OmitType } from '@nestjs/graphql';

import type { NewAttribute } from '../types/new-attribute.type';
import { AttributeDTO } from './attribute.dto';

@InputType()
// `source` / `sourceId` are ownership markers written only by the CRM mapping
// service (ADR 0013 §6) — never through the generic attribute mutations.
export class CreateAttributeInput
  extends OmitType(
    AttributeDTO,
    ['id', 'createdAt', 'updatedAt', 'predefined', 'description', 'source', 'sourceId'],
    InputType,
  )
  implements NewAttribute
{
  // The model declares description non-null (the column defaults to ''),
  // but creation may omit it and take the default.
  @Field(() => String, { nullable: true })
  description?: string;

  // Required for a Random number attribute, ignored otherwise (ADR 0020 §5).
  @Field(() => Int, { nullable: true })
  randomMax?: number;
}
