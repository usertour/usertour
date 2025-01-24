import { Field, ObjectType } from "@nestjs/graphql";
import { BaseModel } from "@/common/models/base.model";

@ObjectType()
export class Localization extends BaseModel {
  @Field(() => String)
  name: string;

  @Field(() => String)
  locale: string;

  @Field(() => String)
  code: string;

  @Field(() => String)
  projectId: string;

  @Field(() => Boolean)
  isDefault: boolean;
}
