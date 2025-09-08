import { RulesCondition, RulesEvaluationOptions, RulesType } from '@usertour/types';
import isEqual from 'fast-deep-equal';
import { evaluateUrlCondition } from './url';
import { evaluateTimeCondition } from './time';
import { evaluateAttributeCondition } from './attribute';

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

/**
 * Evaluate and activate rules conditions with enhanced context and type control
 *
 * @param conditions - Array of rules conditions to evaluate
 * @param options - Evaluation options including context, type control, and ID overrides
 *
 * @example
 * const result = await evaluateRulesConditions(conditions, {
 *   clientContext: {
 *     page_url: 'https://example.com',
 *     viewport_width: 1920,
 *     viewport_height: 1080
 *   },
 *   attributes: userAttributes,
 *   userAttributes: userData,
 *   typeControl: {
 *     [RulesType.CURRENT_PAGE]: true,
 *     [RulesType.TIME]: false,
 *     [RulesType.USER_ATTR]: true
 *   },
 *   activatedIds: ['rule-1', 'rule-2'],
 *   deactivatedIds: ['rule-3']
 * });
 */
const evaluateRule = async (
  condition: RulesCondition,
  options: RulesEvaluationOptions,
): Promise<boolean> => {
  const { typeControl = {}, activatedIds, deactivatedIds, customEvaluators } = options;
  const conditionId = condition.id;

  // Check ID-based overrides first
  if (activatedIds?.includes(conditionId)) return true;
  if (deactivatedIds?.includes(conditionId)) return false;

  // Check if custom evaluator is provided for this rule type
  const customEvaluator = customEvaluators?.[condition.type as RulesType];
  if (customEvaluator) {
    const result = customEvaluator(condition, options);
    return typeof result === 'object' && result !== null && 'then' in result
      ? await result
      : result;
  }

  // Check if evaluation is enabled for this rule type
  // Default is disabled, only enabled when explicitly set to true
  if (typeControl[condition.type as RulesType] !== true) {
    return condition.actived || false;
  }

  // Perform normal evaluation based on rule type
  switch (condition.type) {
    case RulesType.CURRENT_PAGE:
      return evaluateUrlCondition(condition, options.clientContext?.pageUrl ?? '');
    case RulesType.TIME:
      return evaluateTimeCondition(condition);
    case RulesType.USER_ATTR:
      return evaluateAttributeCondition(condition, options);
    default:
      return condition.actived || false;
  }
};

const evaluateRulesConditions = async (
  conditions: RulesCondition[],
  options: RulesEvaluationOptions = {},
): Promise<RulesCondition[]> => {
  const results: RulesCondition[] = [];

  for (const condition of conditions) {
    if (condition.type === 'group' && condition.conditions) {
      results.push({
        ...condition,
        conditions: await evaluateRulesConditions(condition.conditions, options),
      });
    } else {
      results.push({
        ...condition,
        actived: await evaluateRule(condition, options),
      });
    }
  }

  return results;
};

export {
  isEqual,
  conditionsIsSame,
  filterConditionsByType,
  isConditionsActived,
  evaluateRule,
  evaluateRulesConditions,
};
