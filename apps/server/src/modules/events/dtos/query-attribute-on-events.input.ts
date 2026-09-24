import { ArgsType, PickType } from '@nestjs/graphql';

import { AttributeOnEventDTO } from './attribute-on-event.dto';

@ArgsType()
export class QueryAttributeOnEventsInput extends PickType(
  AttributeOnEventDTO,
  ['eventId'],
  ArgsType,
) {}
