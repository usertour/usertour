import type { RulesCondition } from './rules-condition.type';

export type ContentConfigObject = {
  name?: string;
  enabledAutoStartRules: boolean;
  enabledHideRules: boolean;
  autoStartRules: RulesCondition[];
  hideRules: RulesCondition[];
  autoStartRulesSetting?: any;
  hideRulesSetting?: any;
};
