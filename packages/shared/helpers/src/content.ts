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
  const isPublishedInAllEnvironments = environmentList?.every((env: Environment) =>
    content?.contentOnEnvironments?.find(
      (item) =>
        item.published && item.publishedVersionId === version?.id && item.environment.id === env.id,
    ),
  );

  const isPublishedInOneEnvironment =
    content?.published &&
    content?.publishedVersionId === version?.id &&
    environmentList &&
    environmentList?.length === 1;

  return content?.contentOnEnvironments && content?.contentOnEnvironments.length > 0
    ? Boolean(isPublishedInAllEnvironments)
    : Boolean(isPublishedInOneEnvironment);
};

export const isPublishedAtLeastOneEnvironment = (content: Content | null) => {
  if (content?.contentOnEnvironments && content?.contentOnEnvironments?.length > 0) {
    return true;
  }
  if (content?.published && content?.publishedVersionId) {
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
