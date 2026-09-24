import { Field, InputType, OmitType, PartialType } from '@nestjs/graphql';

import type { EventChanges } from '../types/event-changes.type';
import { EventsDTO } from './events.dto';

@InputType()
export class UpdateEventInput
  extends PartialType(
    OmitType(EventsDTO, ['projectId', 'createdAt', 'updatedAt', 'predefined']),
    InputType,
  )
  implements EventChanges
{
  @Field(() => String)
  id: string;
}
