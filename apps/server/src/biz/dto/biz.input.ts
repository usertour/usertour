import { InputType, Field, OmitType } from "@nestjs/graphql";
import { BizModel } from "../models/biz.model";

@InputType()
export class CreateBizInput extends OmitType(
  BizModel,
  ["id", "createdAt", "updatedAt"],
  InputType
) {}

@InputType()
export class CreateBizCompanyInput extends OmitType(
  BizModel,
  ["id", "createdAt", "updatedAt"],
  InputType
) {
  @Field(() => String)
  userId: string;
}
