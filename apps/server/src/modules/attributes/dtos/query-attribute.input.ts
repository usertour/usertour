import { ArgsType, PickType } from '@nestjs/graphql';

import { AttributeDTO } from './attribute.dto';

@ArgsType()
export class QueryAttributeInput extends PickType(
  AttributeDTO,
  ['projectId', 'bizType'],
  ArgsType,
) {}
