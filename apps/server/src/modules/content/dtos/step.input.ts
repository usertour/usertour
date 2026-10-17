import { Field, InputType } from '@nestjs/graphql';
import { JsonValue } from '@prisma/client/runtime/library';
import { IsNotEmpty } from 'class-validator';
import GraphQLJSON from 'graphql-type-json';

import type { StepDraft } from '../types/step-draft.type';
import { StepScreenshotScalar } from './step-screenshot.scalar';
import { StepSettingsScalar } from './step-settings.scalar';
import { StepTargetScalar } from './step-target.scalar';
import { StepTriggerScalar } from './step-trigger.scalar';

@InputType()
export class StepInput implements StepDraft {
  @Field({ nullable: true })
  @IsNotEmpty()
  id?: string;

  // Front-end-generated logical id (cuid). What triggers/actions reference, and
  // the upsert key for the whole-version save. Distinct from the DB primary key
  // `id` (server-generated). Required when steps are sent via updateContentVersion.
  @Field({ nullable: true })
  cvid?: string;

  @Field({ nullable: true })
  @IsNotEmpty()
  sequence?: number;

  @Field()
  @IsNotEmpty()
  name: string;

  @Field()
  @IsNotEmpty()
  type: string;

  @Field(() => StepScreenshotScalar, { nullable: true })
  screenshot?: JsonValue;

  @Field({ nullable: true })
  @IsNotEmpty()
  themeId?: string;

  // setting, data and target are required: their columns are non-null, and a
  // JSON null would pass the database only to fail the non-null output field.
  @Field(() => StepSettingsScalar)
  setting: JsonValue;

  @IsNotEmpty()
  @Field(() => GraphQLJSON)
  data: JsonValue;

  @IsNotEmpty()
  @Field(() => [StepTriggerScalar], { nullable: true })
  trigger?: JsonValue;

  @IsNotEmpty()
  @Field(() => StepTargetScalar)
  target: JsonValue;
}
