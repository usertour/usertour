import {
  RANDOM_AB_VALUES,
  RANDOM_NUMBER_RANGE_MAX,
  RANDOM_NUMBER_RANGE_MIN,
} from '@usertour/constants';
import { BizAttributeTypes } from '@usertour/types';

/**
 * Random bucketing attributes (ADR 0020): a value the system derives for each
 * user or company, stable for that entity and never written by a client.
 * Deriving — rather than drawing and storing a random number — is what makes
 * the value stable for free: recomputing always yields the same bucket, so
 * there is no "assigned twice" state and no race between two connections
 * creating the same entity.
 */

/** A bucketing attribute's shape as far as the derivation is concerned. */
export interface BucketingAttribute {
  id: string;
  dataType: number;
  /** Upper bound of a Random number attribute; ignored for Random A/B. */
  randomMax?: number | null;
}

export const isBucketingDataType = (dataType: number): boolean => {
  return dataType === BizAttributeTypes.RandomAB || dataType === BizAttributeTypes.RandomNumber;
};

/**
 * The type a bucketing attribute behaves as for conditions, filters and the
 * operator picker: Random A/B compares like a String (`is` / `is not`),
 * Random number like a Number. Every other type is itself.
 */
export const effectiveDataType = (dataType: number): number => {
  if (dataType === BizAttributeTypes.RandomAB) {
    return BizAttributeTypes.String;
  }
  if (dataType === BizAttributeTypes.RandomNumber) {
    return BizAttributeTypes.Number;
  }
  return dataType;
};

/** Whether a Random number upper bound is acceptable on a definition. */
export const isValidRandomMax = (randomMax: unknown): randomMax is number => {
  return (
    typeof randomMax === 'number' &&
    Number.isInteger(randomMax) &&
    randomMax >= RANDOM_NUMBER_RANGE_MIN &&
    randomMax <= RANDOM_NUMBER_RANGE_MAX
  );
};

// FNV-1a over the UTF-16 code units, finished with the murmur3 avalanche so
// the low bits are as well mixed as the high ones. 32-bit, non-cryptographic:
// the point is a uniform, stable spread of ids over [0, 1), not secrecy.
const hash32 = (input: string): number => {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2ae35);
  hash ^= hash >>> 16;
  return hash >>> 0;
};

/**
 * The entity's stable point in [0, 1) for one attribute. Keyed on the
 * attribute id and the entity's external id, so a user deleted and
 * re-created, or the same person in two environments of one project, lands
 * in the same bucket — and two attributes never share a split.
 */
export const bucketPoint = (attributeId: string, externalId: string): number => {
  return hash32(`${attributeId}\u0000${externalId}`) / 0x1_0000_0000;
};

/**
 * The stored value for a bucketing attribute, or undefined for any other
 * type. Buckets derive from the point rather than from `hash mod N`, so they
 * are monotone in N: the entities below any percentage threshold are the same
 * set whatever N is.
 */
export const bucketValue = (
  attribute: BucketingAttribute,
  externalId: string,
): string | number | undefined => {
  if (attribute.dataType === BizAttributeTypes.RandomAB) {
    const point = bucketPoint(attribute.id, externalId);
    return RANDOM_AB_VALUES[point < 0.5 ? 0 : 1];
  }
  if (attribute.dataType === BizAttributeTypes.RandomNumber) {
    const max = isValidRandomMax(attribute.randomMax)
      ? attribute.randomMax
      : RANDOM_NUMBER_RANGE_MIN;
    return 1 + Math.floor(bucketPoint(attribute.id, externalId) * max);
  }
  return undefined;
};

/**
 * Every bucketing value the entity should carry, keyed by codeName, for the
 * definitions of its scope. Used at birth (seeding a new row) and at read time
 * (filling in what the backfill has not reached yet); existing keys are left
 * alone so a stored value is never rewritten.
 */
export const missingBucketValues = (
  attributes: Array<BucketingAttribute & { codeName: string }>,
  externalId: string,
  stored: Record<string, unknown>,
): Record<string, string | number> => {
  const values: Record<string, string | number> = {};
  for (const attribute of attributes) {
    if (Object.prototype.hasOwnProperty.call(stored, attribute.codeName)) {
      continue;
    }
    const value = bucketValue(attribute, externalId);
    if (value !== undefined) {
      values[attribute.codeName] = value;
    }
  }
  return values;
};
