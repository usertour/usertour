import {
  autoStartRulesSetting,
  ContentConfigObject,
  ContentPriority,
} from "@usertour-ui/types";

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
      data: { excludes: [], includes: ["/*"] },
      type: "current-page",
      operators: "and",
    },
  ],
};
