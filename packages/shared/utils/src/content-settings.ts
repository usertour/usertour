import {
  ContentConfigObject,
  ContentPriority,
  autoStartRulesSetting,
} from '@usertour-packages/types';
import { deepmerge } from 'deepmerge-ts';

const rulesSetting: autoStartRulesSetting = {
  // frequency: {
  //   frequency: Frequency.ONCE,
  //   every: { duration: 0, times: 1, unit: FrequencyUnits.MINUTES },
  //   atLeast: { duration: 0, unit: FrequencyUnits.MINUTES },
  // },
  startIfNotComplete: false,
  priority: ContentPriority.MEDIUM,
  wait: 0,
};

const hideRulesSetting = {};

export const defaultContentConfig: ContentConfigObject = {
  enabledAutoStartRules: false,
  enabledHideRules: false,
  autoStartRules: [],
  hideRules: [],
  autoStartRulesSetting: rulesSetting,
  hideRulesSetting,
};

export const autoStartConditions: ContentConfigObject = {
  ...defaultContentConfig,
  enabledAutoStartRules: true,
  autoStartRules: [
    {
      data: { excludes: [], includes: ['/*'] },
      type: 'current-page',
      operators: 'and',
    },
  ],
};

export const buildConfig = (config: ContentConfigObject | undefined): ContentConfigObject => {
  return {
    ...defaultContentConfig,
    ...config,
    autoStartRulesSetting: deepmerge(
      defaultContentConfig.autoStartRulesSetting,
      config?.autoStartRulesSetting || {},
    ),
    hideRulesSetting: config?.hideRulesSetting || {},
  };
};
