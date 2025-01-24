import { Field, Int, ObjectType, registerEnumType } from "@nestjs/graphql";
import { BaseModel } from "@/common/models/base.model";
import GraphQLJSON from "graphql-type-json";
import { JsonObject, JsonValue } from "@prisma/client/runtime/library";

export enum SegmentDataType {
  ALL = 1,
  CONDITION,
  MANUAL,
}

export enum SegmentBizType {
  USER = 1,
  COMPANY,
}

registerEnumType(SegmentDataType, {
  name: "SegmentDataType",
});
registerEnumType(SegmentBizType, {
  name: "SegmentBizType",
});

@ObjectType()
export class Segment extends BaseModel {
  @Field(() => String)
  environmentId: string;

  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  columns?: JsonValue;

  //1,bizUser，2 bizCompany
  @Field(() => SegmentBizType)
  bizType: number;

  //1:All, 2:Condition, 3:Manual
  @Field(() => SegmentDataType)
  dataType: number;

  @Field(() => GraphQLJSON, { nullable: true })
  data?: JsonValue;
}

@ObjectType()
export class BizUserOnSegmentModel extends BaseModel {
  @Field(() => String)
  segmentId: string;

  @Field(() => String)
  bizUserId: string;

  @Field(() => GraphQLJSON, { nullable: true })
  data?: JsonObject;
}

@ObjectType()
export class BizCompanyOnSegmentModel extends BaseModel {
  @Field(() => String)
  segmentId: string;

  @Field(() => String)
  bizCompanyId: string;

  @Field(() => GraphQLJSON, { nullable: true })
  data?: JsonObject;
}
