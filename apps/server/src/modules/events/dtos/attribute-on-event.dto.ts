import { BaseModel } from '@/common/models/base.model';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('AttributeOnEvent')
export class AttributeOnEventDTO extends BaseModel {
  @Field(() => String)
  attributeId: string;

  @Field(() => String)
  eventId: string;
}
