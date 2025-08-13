import { RulesCondition, RulesType } from '@usertour/types';
import isEqual from 'fast-deep-equal';

const compareConditionsItem = (item1: RulesCondition, item2: RulesCondition) => {
  const { data = {}, ...others1 } = item1;
  const { data: data2 = {}, ...others2 } = item2;
  if (!isEqual(others2, others1)) {
    return false;
  }
  for (const key in data) {
    if (!isEqual(data[key], data2[key])) {
      return false;
    }
  }
  return true;
};

const conditionsIsSame = (rr1: RulesCondition[], rr2: RulesCondition[]) => {
  const r1 = [...rr1];
  const r2 = [...rr2];
  if (r1.length === 0 && r2.length === 0) {
    return true;
  }
  if (r1.length !== r2.length) {
    return false;
  }
  const group1 = r1.filter((item) => item.type === 'group');
  const group2 = r2.filter((item) => item.type === 'group');
  if (group1.length !== group2.length) {
    return false;
  }
  for (let index = 0; index < r1.length; index++) {
    const item1 = r1[index];
    const item2 = r2[index];
    if (!item1 || !item2) {
      return false;
    }
    if (item1.type === 'group') {
      if (!item2.conditions) {
        return false;
      }
      const c1 = item1.conditions as RulesCondition[];
      const c2 = item2.conditions as RulesCondition[];
      if (item1.operators !== item2.operators) {
        return false;
      }
      if (!conditionsIsSame(c1, c2)) {
        return false;
      }
    } else {
      if (!compareConditionsItem(item1, item2)) {
        return false;
      }
    }
  }
  return true;
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
