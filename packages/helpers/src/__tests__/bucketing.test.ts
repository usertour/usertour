import { BizAttributeTypes } from '@usertour/types';
import {
  bucketPoint,
  bucketValue,
  effectiveDataType,
  isBucketingDataType,
  isValidRandomMax,
  missingBucketValues,
} from '../bucketing';

const ab = { id: 'attr_ab', dataType: BizAttributeTypes.RandomAB };
const hundred = { id: 'attr_100', dataType: BizAttributeTypes.RandomNumber, randomMax: 100 };

const sampleIds = (count: number, prefix = 'user'): string[] =>
  Array.from({ length: count }, (_, index) => `${prefix}_${index}`);

describe('effectiveDataType', () => {
  test.each([
    [BizAttributeTypes.RandomAB, BizAttributeTypes.String],
    [BizAttributeTypes.RandomNumber, BizAttributeTypes.Number],
    [BizAttributeTypes.String, BizAttributeTypes.String],
    [BizAttributeTypes.Number, BizAttributeTypes.Number],
    [BizAttributeTypes.List, BizAttributeTypes.List],
    [BizAttributeTypes.DateTime, BizAttributeTypes.DateTime],
    [BizAttributeTypes.Boolean, BizAttributeTypes.Boolean],
  ])('%s → %s', (input, expected) => {
    expect(effectiveDataType(input)).toBe(expected);
  });

  test('isBucketingDataType names exactly the two', () => {
    expect(isBucketingDataType(BizAttributeTypes.RandomAB)).toBe(true);
    expect(isBucketingDataType(BizAttributeTypes.RandomNumber)).toBe(true);
    expect(isBucketingDataType(BizAttributeTypes.Number)).toBe(false);
  });
});

describe('isValidRandomMax', () => {
  test.each([
    [2, true],
    [100, true],
    [10000, true],
    [1, false],
    [10001, false],
    [2.5, false],
    ['100', false],
    [undefined, false],
    [null, false],
  ])('%s → %s', (input, expected) => {
    expect(isValidRandomMax(input)).toBe(expected);
  });
});

describe('bucketPoint', () => {
  test('is deterministic', () => {
    expect(bucketPoint('a1', 'user_1')).toBe(bucketPoint('a1', 'user_1'));
  });

  test('lies in [0, 1)', () => {
    for (const id of sampleIds(1000)) {
      const point = bucketPoint('a1', id);
      expect(point).toBeGreaterThanOrEqual(0);
      expect(point).toBeLessThan(1);
    }
  });

  test('differs per attribute, so two splits are independent', () => {
    const ids = sampleIds(2000);
    const same = ids.filter((id) => bucketPoint('a1', id) === bucketPoint('a2', id)).length;
    expect(same).toBe(0);
    // Two independent coin flips agree about half the time, never always.
    const agree = ids.filter(
      (id) => bucketPoint('a1', id) < 0.5 === bucketPoint('a2', id) < 0.5,
    ).length;
    expect(agree / ids.length).toBeGreaterThan(0.4);
    expect(agree / ids.length).toBeLessThan(0.6);
  });

  test('is uniform enough: ten deciles within ±15 % of expected over 20k ids', () => {
    const ids = sampleIds(20000);
    const deciles = new Array(10).fill(0);
    for (const id of ids) {
      deciles[Math.floor(bucketPoint('attr_uniform', id) * 10)] += 1;
    }
    for (const count of deciles) {
      expect(count).toBeGreaterThan(2000 * 0.85);
      expect(count).toBeLessThan(2000 * 1.15);
    }
  });

  test('is not fooled by ids that differ only in a trailing digit', () => {
    const near = sampleIds(1000, 'cust_9000');
    const halves = near.filter((id) => bucketPoint('a1', id) < 0.5).length;
    expect(halves).toBeGreaterThan(400);
    expect(halves).toBeLessThan(600);
  });
});

describe('bucketValue', () => {
  test('Random A/B yields A or B, about half each', () => {
    const ids = sampleIds(5000);
    const values = ids.map((id) => bucketValue(ab, id));
    expect(new Set(values)).toEqual(new Set(['A', 'B']));
    const a = values.filter((value) => value === 'A').length;
    expect(a / ids.length).toBeGreaterThan(0.45);
    expect(a / ids.length).toBeLessThan(0.55);
  });

  test('Random number yields integers in [1, randomMax], all reached', () => {
    const ids = sampleIds(5000);
    const values = ids.map((id) => bucketValue({ ...hundred, randomMax: 10 }, id) as number);
    for (const value of values) {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(10);
    }
    expect(new Set(values).size).toBe(10);
  });

  test('buckets are monotone in randomMax: the same users sit below a percentage', () => {
    const ids = sampleIds(5000);
    const belowTenPercentAt100 = new Set(
      ids.filter((id) => (bucketValue(hundred, id) as number) <= 10),
    );
    const belowTenPercentAt1000 = new Set(
      ids.filter((id) => (bucketValue({ ...hundred, randomMax: 1000 }, id) as number) <= 100),
    );
    expect(belowTenPercentAt1000).toEqual(belowTenPercentAt100);
  });

  test('an invalid randomMax falls back to the smallest range instead of throwing', () => {
    const value = bucketValue({ ...hundred, randomMax: 0 }, 'user_1') as number;
    expect([1, 2]).toContain(value);
  });

  test('other types yield undefined', () => {
    expect(bucketValue({ id: 'x', dataType: BizAttributeTypes.String }, 'user_1')).toBeUndefined();
  });
});

describe('missingBucketValues', () => {
  test('fills only the bucketing definitions the entity lacks', () => {
    const attributes = [
      { ...ab, codeName: 'experiment' },
      { ...hundred, codeName: 'rollout' },
      { id: 'attr_plan', dataType: BizAttributeTypes.String, codeName: 'plan' },
    ];
    const values = missingBucketValues(attributes, 'user_1', { rollout: 42 });
    expect(Object.keys(values)).toEqual(['experiment']);
    expect(['A', 'B']).toContain(values.experiment);
  });

  test('a codeName that names an Object.prototype member is still missing', () => {
    const values = missingBucketValues([{ ...ab, codeName: 'constructor' }], 'u', {});
    expect(['A', 'B']).toContain(values.constructor);
  });

  test('returns an empty object when nothing is missing', () => {
    expect(
      missingBucketValues([{ ...ab, codeName: 'experiment' }], 'u', { experiment: 'A' }),
    ).toEqual({});
  });
});
