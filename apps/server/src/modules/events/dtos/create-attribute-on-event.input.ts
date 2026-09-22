import { InputType, OmitType } from '@nestjs/graphql';

import type { NewAttributeOnEvent } from '../types/new-attribute-on-event.type';
import { AttributeOnEventDTO } from './attribute-on-event.dto';

@InputType()
export class CreateAttributeOnEventInput
  extends OmitType(AttributeOnEventDTO, ['id', 'createdAt', 'updatedAt'], InputType)
  implements NewAttributeOnEvent {}
