import { BaseDTO } from '@/modules/common/dtos/base.dto';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('AttributeOnEvent')
export class AttributeOnEventDTO extends BaseDTO {
  @Field(() => String)
  attributeId: string;

  @Field(() => String)
  eventId: string;
}
