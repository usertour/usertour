import { BaseModel } from '@/common/models/base.model';
import { Field, ObjectType } from '@nestjs/graphql';
import { JsonArray, JsonValue } from '@prisma/client/runtime/library';
import GraphQLJSON from 'graphql-type-json';

@ObjectType()
export class TargetModel {
  selectors?: string;
  content?: string;
  sequence?: string;
  precision?: string;
  isDynamicContent?: boolean;
  customSelector?: string;
  type: string;
}

@ObjectType()
export class ScreenshotOutput {
  mini: string;
  full: string;
}

@ObjectType()
export class StepSettingModel {
  enabledBackdrop?: boolean;
  enabledBlockTarget?: boolean;
  align?: string;
  side?: string;
  alignType?: string;
  sideOffset?: number;
  alignOffset?: number;
  width?: number;
  skippable?: boolean;
  position?: string;
  positionOffsetX?: number;
  positionOffsetY?: number;
}

@ObjectType()
export class Step extends BaseModel {
  @Field(() => String, { nullable: true })
  name?: string;

  @Field(() => String)
  type: string;

  @Field(() => String)
  versionId: string;

  @Field(() => String)
  cvid: string;

  @Field(() => String, { nullable: true })
  themeId?: string;

  @Field(() => Number, { nullable: true })
  sequence?: number;

  @Field(() => String, { nullable: true })
  contentId?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  data?: JsonValue;

  @Field(() => GraphQLJSON, { nullable: true })
  target?: JsonValue;

  @Field(() => GraphQLJSON, { nullable: true })
  trigger?: JsonArray;
  // @Field(() => TargetModel)
  // target?: TargetModel;

  @Field(() => GraphQLJSON, { nullable: true })
  screenshot?: JsonValue;
  // @Field(() => ScreenshotOutput)
  // screenshot?: ScreenshotOutput;

  @Field(() => GraphQLJSON, { nullable: true })
  setting?: JsonValue;
  // @Field(() => StepSettingModel)
  // setting?: StepSettingModel;
}
