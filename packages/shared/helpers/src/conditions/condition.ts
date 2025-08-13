import { RulesCondition, RulesType } from '@usertour/types';
import isEqual from 'fast-deep-equal';

const conditionsIsSame = (rr1: RulesCondition[], rr2: RulesCondition[]) => {
  return isEqual(rr1, rr2);
};

const isConditionsActived = (conditions: RulesCondition[]): boolean => {
  if (!conditions || conditions.length === 0) {
    return false;
  }
  const operator = conditions[0].operators;
  const actives = conditions.filter((rule: RulesCondition) => {
    if (!rule.conditions) {
      return rule.actived;
    }
    return isConditionsActived(rule.conditions);
  });
  return operator === 'and' ? actives.length === conditions.length : actives.length > 0;
};

/**
 * Recursively filter conditions by RulesType
 * @param conditions - Array of rules conditions
 * @param allowedTypes - Array of RulesType to filter by
 * @returns Filtered conditions array
 */
const filterConditionsByType = (
  conditions: RulesCondition[],
  allowedTypes: RulesType[],
): RulesCondition[] => {
  return conditions
    .filter((condition) => {
      // If it's a group, recursively filter its conditions
      if (condition.type === 'group' && condition.conditions) {
        const filteredGroupConditions = filterConditionsByType(condition.conditions, allowedTypes);
        // Only include group if it has filtered conditions
        return filteredGroupConditions.length > 0;
      }

      // Check if condition type is in allowed types
      return allowedTypes.includes(condition.type as RulesType);
    })
    .map((condition) => {
      // If it's a group, create a new group with filtered conditions
      if (condition.type === 'group' && condition.conditions) {
        return {
          ...condition,
          conditions: filterConditionsByType(condition.conditions, allowedTypes),
        };
      }

      return condition;
    });
};

export { isEqual, conditionsIsSame, filterConditionsByType, isConditionsActived };
