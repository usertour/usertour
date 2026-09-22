import { InputType, OmitType } from '@nestjs/graphql';

import type { NewEvent } from '../types/new-event.type';
import { EventsDTO } from './events.dto';

@InputType()
export class CreateEventInput
  extends OmitType(EventsDTO, ['id', 'createdAt', 'updatedAt', 'predefined'], InputType)
  implements NewEvent {}
