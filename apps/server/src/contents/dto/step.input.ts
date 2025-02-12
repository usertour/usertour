import { Field, InputType, OmitType, PartialType } from '@nestjs/graphql';
import { JsonValue } from '@prisma/client/runtime/library';
import { IsNotEmpty } from 'class-validator';
import GraphQLJSON from 'graphql-type-json';
import { Step, StepSettingModel, TargetModel } from '../models/step.model';

@InputType()
export class SettingInput extends PartialType(StepSettingModel, InputType) {}

@InputType()
export class TargetInput extends PartialType(TargetModel, InputType) {}

@InputType()
export class StepInput {
  @Field({ nullable: true })
  @IsNotEmpty()
  id?: string;

  @Field({ nullable: true })
  @IsNotEmpty()
  sequence?: number;

  @Field({ nullable: true })
  @IsNotEmpty()
  name?: string;

  @Field()
  @IsNotEmpty()
  type: string;

  @Field(() => GraphQLJSON, { nullable: true })
  screenshot?: JsonValue;

  @Field({ nullable: true })
  @IsNotEmpty()
  themeId?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  setting?: JsonValue;

  @IsNotEmpty()
  @Field(() => GraphQLJSON, { nullable: true })
  data?: JsonValue;

  @IsNotEmpty()
  @Field(() => GraphQLJSON, { nullable: true })
  trigger?: JsonValue;

  @IsNotEmpty()
  @Field(() => GraphQLJSON, { nullable: true })
  target?: JsonValue;
}

@InputType()
export class CreateStepInput extends OmitType(
  Step,
  ['id', 'createdAt', 'updatedAt', 'cvid'],
  InputType,
) {}

@InputType()
export class UpdateStepInput extends PartialType(
  OmitType(Step, ['id', 'createdAt', 'updatedAt', 'cvid'], InputType),
) {}
