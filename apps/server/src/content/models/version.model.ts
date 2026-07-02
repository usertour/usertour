import { BaseModel } from '@/common/models/base.model';
import { Field, ObjectType } from '@nestjs/graphql';
import { JsonObject } from '@prisma/client/runtime/library';
import GraphQLJSON from 'graphql-type-json';
import { Step } from './step.model';

export enum ChecklistInitialDisplay {
  EXPANDED = 'expanded',
  BUTTON = 'button',
}

export enum ChecklistCompletionOrder {
  ANY = 'any',
  ORDERED = 'ordered',
}

export interface ChecklistData {
  buttonText: string;
  initialDisplay: ChecklistInitialDisplay;
  completionOrder: ChecklistCompletionOrder;
  preventDismissChecklist: boolean;
  items: ChecklistItemType[];
  content: any;
}

export interface ChecklistItemType {
  id: string;
  name: string;
  description?: string;
  isCompleted: boolean;
  isVisible?: boolean;
  clickedActions: any;
  completeConditions: any;
  onlyShowTask: boolean;
  onlyShowTaskConditions: any;
}

export type RulesCondition = {
  type: string;
  data: any;
  operators?: 'and' | 'or';
  actived?: boolean;
  conditions?: RulesCondition[];
};

export type ContentConfigObject = {
  name?: string;
  enabledAutoStartRules: boolean;
  enabledHideRules: boolean;
  autoStartRules: RulesCondition[];
  hideRules: RulesCondition[];
  autoStartRulesSetting?: any;
  hideRulesSetting?: any;
};

@ObjectType()
export class Version extends BaseModel {
  @Field(() => Number)
  sequence: number;

  /** Who created this version row (null for rows predating attribution). */
  @Field(() => String, { nullable: true })
  createdByUserId?: string | null;

  /** Who last wrote the version row. */
  @Field(() => String, { nullable: true })
  updatedByUserId?: string | null;

  /** Display name for updatedByUserId (resolved field). */
  @Field(() => String, { nullable: true })
  updatedByName?: string | null;

  @Field(() => String, { nullable: true })
  themeId?: string;

  @Field(() => String, { nullable: true })
  contentId: string;

  @Field(() => [Step], { nullable: true })
  steps?: [Step];

  @Field(() => GraphQLJSON, { nullable: true })
  config?: JsonObject;

  @Field(() => GraphQLJSON, { nullable: true })
  data?: JsonObject;

  @Field(() => Date, { nullable: true })
  scheduledAt?: Date;
}
