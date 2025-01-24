import { Field, ObjectType } from "@nestjs/graphql";
import { BaseModel } from "@/common/models/base.model";

@ObjectType()
export class Register extends BaseModel {
  @Field()
  email: string;
}
