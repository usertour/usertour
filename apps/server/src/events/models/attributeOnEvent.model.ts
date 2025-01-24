import { ObjectType, Field } from "@nestjs/graphql";
import { BaseModel } from "@/common/models/base.model";

@ObjectType()
export class AttributeOnEvent extends BaseModel {

  @Field(() => String)
  attributeId: string;

  @Field(() => String)
  eventId: string;
}
