import { Field, Int, ObjectType } from "@nestjs/graphql";
import { BaseModel } from "@/common/models/base.model";

export enum AttributeBizType {
  USER = 1,
  COMPANY,
  MEMBERSHIP,
  EVENT
}

export enum AttributeDataType {
  Number = 1,
  String,
  Boolean,
  List,
  DateTime,
  RandomAB,
  RandomNumber,
}

@ObjectType()
export class Attribute extends BaseModel {
  @Field(() => Int)
  bizType: number;

  @Field(() => String)
  projectId: string;

  @Field(() => String)
  displayName: string;

  @Field(() => String)
  codeName: string;

  @Field(() => String)
  description?: string;

  @Field(() => Int)
  dataType: number;

  @Field(() => Boolean)
  predefined: boolean;

}
