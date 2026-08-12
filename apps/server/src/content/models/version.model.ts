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

  /**
   * Stamped on first publish, never cleared, not copied to forks — non-null
   * means the version is FROZEN (the server's versionFrozen rule). Exposed so
   * view-side-effect guards can avoid writing onto a frozen version without
   * probing the server (a probe would fork — the very side effect they avoid).
   */
  @Field(() => Date, { nullable: true })
  publishedAt?: Date | null;

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
