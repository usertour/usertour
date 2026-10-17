import { Field, ObjectType } from '@nestjs/graphql';
import { JsonArray, JsonValue } from '@prisma/client/runtime/library';
import GraphQLJSON from 'graphql-type-json';

import { BaseDTO } from '@/modules/common/dtos/base.dto';
import { StepScreenshotScalar } from './step-screenshot.scalar';
import { StepSettingsScalar } from './step-settings.scalar';
import { StepTargetScalar } from './step-target.scalar';
import { StepTriggerScalar } from './step-trigger.scalar';

@ObjectType('Step')
export class StepDTO extends BaseDTO {
  @Field(() => String)
  name: string;

  @Field(() => String)
  type: string;

  @Field(() => String)
  versionId: string;

  @Field(() => String)
  cvid: string;

  @Field(() => String, { nullable: true })
  themeId?: string;

  @Field(() => Number)
  sequence: number;

  @Field(() => String, { nullable: true })
  contentId?: string;

  @Field(() => GraphQLJSON)
  data: JsonValue;

  @Field(() => StepTargetScalar)
  target: JsonValue;

  @Field(() => [StepTriggerScalar], { nullable: true })
  trigger?: JsonArray;

  @Field(() => StepScreenshotScalar, { nullable: true })
  screenshot?: JsonValue;

  @Field(() => StepSettingsScalar)
  setting: JsonValue;
}
