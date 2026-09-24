import { InputType, PickType } from '@nestjs/graphql';

import { EventsDTO } from './events.dto';

@InputType()
export class DeleteEventInput extends PickType(EventsDTO, ['id'], InputType) {}
