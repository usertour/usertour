import { ArgsType, InputType, OmitType, PickType } from '@nestjs/graphql';
import { AttributeOnEvent } from '../models/attributeOnEvent.model';

@InputType()
export class CreateAttributeOnEventInput extends OmitType(
  AttributeOnEvent,
  ['id', 'createdAt', 'updatedAt'],
  InputType,
) {}

@ArgsType()
export class QueryAttributeOnEventsInput extends PickType(
  AttributeOnEvent,
  ['eventId'],
  ArgsType,
) {}
