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
    ]),
    InputType,
  )
  implements AttributeChanges
{
  @Field(() => String)
  id: string;
}
