import { Field, InputType, OmitType, PartialType } from '@nestjs/graphql';

import type { AttributeChanges } from '../types/attribute-changes.type';
import { AttributeDTO } from './attribute.dto';

@InputType()
export class UpdateAttributeInput
  extends PartialType(
    OmitType(AttributeDTO, [
      'projectId',
      'createdAt',
      'updatedAt',
      'predefined',
      'source',
      'sourceId',
      // Locked after creation (ADR 0020): changing N would change the meaning
      // of every condition written against the attribute.
      'randomMax',
    ]),
    InputType,
  )
  implements AttributeChanges
{
  @Field(() => String)
  id: string;
}
