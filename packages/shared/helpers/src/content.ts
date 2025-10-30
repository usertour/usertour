import {
  Content,
  ContentConfigObject,
  ContentPriority,
  ContentVersion,
  Environment,
  autoStartRulesSetting,
} from '@usertour/types';
import { deepmerge } from 'deepmerge-ts';

export const isPublishedInAllEnvironments = (
  content: Content | null,
  environmentList: Environment[] | null,
  version: ContentVersion | null,
) => {
  // Early return if any required data is missing
  if (!content?.contentOnEnvironments?.length || !environmentList?.length || !version?.id) {
    return false;
  }

  // Check if all environments have the version published
  return environmentList.every((env) =>
    content?.contentOnEnvironments?.some(
      (item) =>
        item.published && item.publishedVersionId === version.id && item.environment.id === env.id,
    ),
  );
};

export const isPublishedAtLeastOneEnvironment = (content: Content | null) => {
  if (content?.contentOnEnvironments && content?.contentOnEnvironments?.length > 0) {
    return true;
  }
  return false;
};

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
