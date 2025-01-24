import { Field, ObjectType } from "@nestjs/graphql";
import { BaseModel } from "@/common/models/base.model";
import { Step } from "./step.model";

export enum ContentType {
  CHECKLIST = "checklist",
  FLOW = "flow",
  LAUNCHER = "launcher",
  BANNER = "banner",
  NPS = "nps",
  SURVEY = "survey",
  TRACKER = "tracker",
  EVENT = "event",
}

@ObjectType()
export class Content extends BaseModel {
  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  buildUrl?: string;

  @Field(() => String, { nullable: true })
  type: string;

  @Field(() => String)
  environmentId: string;

  @Field(() => String, { nullable: true })
  editedVersionId?: string;

  @Field(() => Date)
  publishedAt: Date;

  @Field(() => String, { nullable: true })
  publishedVersionId?: string;

  @Field(() => Boolean)
  published: Boolean;

  @Field(() => Boolean)
  deleted: Boolean;

  @Field(() => [Step], { nullable: true })
  steps?: [Step];
}
