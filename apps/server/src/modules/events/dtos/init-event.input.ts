import { InputType, PickType } from '@nestjs/graphql';

import { EventsDTO } from './events.dto';

@InputType()
export class InitEventInput extends PickType(EventsDTO, ['displayName', 'codeName'], InputType) {}
