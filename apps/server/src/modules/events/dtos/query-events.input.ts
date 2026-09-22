import { ArgsType, PickType } from '@nestjs/graphql';

import { EventsDTO } from './events.dto';

@ArgsType()
export class QueryEventsInput extends PickType(EventsDTO, ['projectId'], ArgsType) {}
