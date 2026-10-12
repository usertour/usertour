import { Field, InputType, OmitType } from '@nestjs/graphql';

import type { NewEvent } from '../types/new-event.type';
import { EventsDTO } from './events.dto';

@InputType()
export class CreateEventInput
  extends OmitType(
    EventsDTO,
    ['id', 'createdAt', 'updatedAt', 'predefined', 'description'],
    InputType,
  )
  implements NewEvent
{
  // The model declares description non-null (the column defaults to ''),
  // but creation may omit it and take the default.
  @Field(() => String, { nullable: true })
  description?: string;
}
