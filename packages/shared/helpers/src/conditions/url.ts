import { RulesCondition } from '@usertour/types';
import { matchUrlPattern } from './url-v2';

const isMatchUrlPattern = (_url: string, includes: string[], excludes: string[]) => {
  return matchUrlPattern({ includes, excludes }, _url);
};

const evaluateUrlCondition = (rules: RulesCondition, url: string) => {
  const { excludes = [], includes = [] } = rules.data || {};
  return isMatchUrlPattern(url, includes, excludes);
};

export { isMatchUrlPattern, evaluateUrlCondition };
