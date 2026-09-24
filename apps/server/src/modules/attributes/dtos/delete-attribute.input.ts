import { InputType, PickType } from '@nestjs/graphql';

import { AttributeDTO } from './attribute.dto';

@InputType()
export class DeleteAttributeInput extends PickType(AttributeDTO, ['id'], InputType) {}
