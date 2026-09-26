import {
  AttributeBizTypes,
  AttributeDataType,
  BizAttributeTypes,
  RulesCondition,
  RulesEvaluationOptions,
  SimpleAttribute,
} from '@usertour/types';
import { evaluateAttributeCondition } from '../conditions/attribute';
import { OPERATORS_BY_DATATYPE, operatorsFor } from '../conditions/operator-mappings';

/**
 * A bucketing attribute (ADR 0020 §4) conditions as the type it resembles:
 * Random A/B as a String, Random number as a Number — in the evaluator and
 * in the operator picker alike.
 */
const attributes: SimpleAttribute[] = [
  {
    id: 'experiment-attr',
    codeName: 'experiment',
    dataType: BizAttributeTypes.RandomAB,
    bizType: AttributeBizTypes.User,
  },
  {
    id: 'rollout-attr',
    codeName: 'rollout',
    dataType: BizAttributeTypes.RandomNumber,
    bizType: AttributeBizTypes.User,
  },
];

const options: RulesEvaluationOptions = {
  attributes,
  userAttributes: { experiment: 'B', rollout: 7 },
};

const condition = (
  attrId: string,
  logic: string,
  value?: unknown,
  value2?: unknown,
): RulesCondition =>
  ({
    id: `c-${attrId}-${logic}`,
    type: 'condition',
    operators: 'and',
    data: { attrId, logic, value, value2 },
  }) as RulesCondition;

describe('bucketing attributes in conditions', () => {
  test.each([
    ['is B', condition('experiment-attr', 'is', 'B'), true],
    ['is A', condition('experiment-attr', 'is', 'A'), false],
    ['is not A', condition('experiment-attr', 'not', 'A'), true],
    ['has any value', condition('experiment-attr', 'any'), true],
    ['rollout <= 10', condition('rollout-attr', 'isLessThanOrEqualTo', 10), true],
    ['rollout <= 5', condition('rollout-attr', 'isLessThanOrEqualTo', 5), false],
    ['rollout between 5 and 9', condition('rollout-attr', 'between', 5, 9), true],
    ['rollout is 7', condition('rollout-attr', 'is', 7), true],
  ])('%s', (_, rule, expected) => {
    expect(evaluateAttributeCondition(rule, options)).toBe(expected);
  });

  test('a missing value is empty, never a match', () => {
    const empty: RulesEvaluationOptions = { attributes, userAttributes: {} };
    expect(evaluateAttributeCondition(condition('experiment-attr', 'is', 'A'), empty)).toBe(false);
    expect(evaluateAttributeCondition(condition('experiment-attr', 'empty'), empty)).toBe(true);
    expect(evaluateAttributeCondition(condition('rollout-attr', 'isLessThan', 50), empty)).toBe(
      false,
    );
  });

  test('the operator picker offers equality only for A/B and the Number set for a number', () => {
    expect(operatorsFor(BizAttributeTypes.RandomAB).map((entry) => entry.value)).toEqual([
      'is',
      'not',
    ]);
    expect(operatorsFor(BizAttributeTypes.RandomNumber)).toBe(
      OPERATORS_BY_DATATYPE[AttributeDataType.Number],
    );
  });
});
