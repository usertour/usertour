import { BizAttributeTypes } from '@usertour/types';
import {
  ATTRIBUTE_DELETE,
  applyAttributeWrite,
  AttributeWrite,
  coerceAttributeValue,
  inferWriteDataType,
  normalizeIsoDateTime,
  parseAttributeWrite,
} from '../attribute-write';

const parsed = (value: unknown): AttributeWrite => {
  const result = parseAttributeWrite(value);
  if (!result.ok) {
    throw new Error(`expected a valid write, got: ${result.reason}`);
  }
  return result.write;
};

const rejected = (value: unknown): string => {
  const result = parseAttributeWrite(value);
  if (result.ok) {
    throw new Error(`expected a rejection, got: ${JSON.stringify(result.write)}`);
  }
  return result.reason;
};

describe('parseAttributeWrite', () => {
  test.each([
    ['string', 'pro'],
    ['number', 12],
    ['boolean', false],
    ['list', ['a', 'b']],
    ['iso string', '2024-12-12T08:30:00.000Z'],
  ])('%s literal passes through', (_, value) => {
    expect(parsed(value)).toEqual({ kind: 'literal', value });
  });

  test('null is a delete', () => {
    expect(parsed(null)).toEqual({ kind: 'delete' });
  });

  test.each(['constructor', 'toString', '__proto__'])(
    'data_type %s is not a type name, whatever the prototype says',
    (name) => {
      expect(rejected({ set: 'x', data_type: name })).toMatch(/data_type must be one of/);
    },
  );

  test.each([
    ['set', { set: 'x' }, { kind: 'set', value: 'x', dataType: undefined }],
    [
      'set_once',
      { set_once: 'google' },
      { kind: 'set_once', value: 'google', dataType: undefined },
    ],
    ['add', { add: 1 }, { kind: 'add', value: 1 }],
    ['negative add', { add: -1.5 }, { kind: 'add', value: -1.5 }],
    ['union scalar', { union: 'export' }, { kind: 'union', values: ['export'] }],
    ['union list', { union: ['a', 'b'] }, { kind: 'union', values: ['a', 'b'] }],
    ['union with a null hole', { union: ['a', null] }, { kind: 'union', values: ['a'] }],
    ['remove scalar', { remove: 'old' }, { kind: 'remove', values: ['old'] }],
    ['remove list', { remove: ['a', 1, true] }, { kind: 'remove', values: ['a', 1, true] }],
  ])('%s operation', (_, value, expected) => {
    expect(parsed(value)).toEqual(expected);
  });

  test.each([
    ['string', BizAttributeTypes.String],
    ['number', BizAttributeTypes.Number],
    ['boolean', BizAttributeTypes.Boolean],
    ['datetime', BizAttributeTypes.DateTime],
    ['list', BizAttributeTypes.List],
  ])('data_type %s maps onto set and set_once', (name, dataType) => {
    expect(parsed({ set: 'v', data_type: name })).toEqual({ kind: 'set', value: 'v', dataType });
    expect(parsed({ set_once: 'v', data_type: name })).toEqual({
      kind: 'set_once',
      value: 'v',
      dataType,
    });
  });

  test.each([
    ['empty object', {}],
    ['unknown key', { foo: 1 }],
    ['two operations', { add: 1, union: 'x' }],
    ['operation plus stray key', { set: 1, extra: true }],
    ['legacy subtract', { subtract: 1 }],
    ['legacy append', { append: ['a'] }],
    ['legacy prepend', { prepend: ['a'] }],
    ['data_type alone', { data_type: 'string' }],
    ['data_type with add', { add: 1, data_type: 'number' }],
    ['data_type with union', { union: 'a', data_type: 'list' }],
    ['unknown data_type', { set: 'x', data_type: 'json' }],
    ['non-string data_type', { set: 'x', data_type: 2 }],
    ['set null', { set: null }],
    ['set undefined', { set: undefined }],
    ['set nested object', { set: { a: 1 } }],
    ['add string', { add: '1' }],
    ['add NaN', { add: Number.NaN }],
    ['add Infinity', { add: Number.POSITIVE_INFINITY }],
    ['union object', { union: { a: 1 } }],
    ['union nested list', { union: [['a']] }],
    ['union list holding an object', { union: ['a', { b: 1 }] }],
    ['remove object', { remove: {} }],
    ['class instance', new Date()],
  ])('%s is rejected', (_, value) => {
    expect(rejected(value)).toEqual(expect.any(String));
  });
});

describe('inferWriteDataType', () => {
  test.each([
    ['add', { add: 1 }, BizAttributeTypes.Number],
    ['union', { union: 'a' }, BizAttributeTypes.List],
    ['remove', { remove: 'a' }, BizAttributeTypes.List],
    ['set by value', { set: 'a' }, BizAttributeTypes.String],
    [
      'set by data_type',
      { set: '2024-12-12T00:00:00.000Z', data_type: 'string' },
      BizAttributeTypes.String,
    ],
    ['set_once by value', { set_once: 3 }, BizAttributeTypes.Number],
    ['set_once by data_type', { set_once: 10023, data_type: 'string' }, BizAttributeTypes.String],
    ['literal number', 12, BizAttributeTypes.Number],
    ['literal strict iso', '2024-12-12T00:00:00.000Z', BizAttributeTypes.DateTime],
    ['literal offset iso stays string', '2024-12-12T00:00:00+08:00', BizAttributeTypes.String],
    ['literal list', ['a'], BizAttributeTypes.List],
  ])('%s', (_, value, expected) => {
    expect(inferWriteDataType(parsed(value))).toBe(expected);
  });

  test('delete has no type', () => {
    expect(inferWriteDataType({ kind: 'delete' })).toBe(BizAttributeTypes.Nil);
  });
});

describe('normalizeIsoDateTime', () => {
  test.each([
    ['strict utc', '2024-12-12T08:30:00.000Z', '2024-12-12T08:30:00.000Z'],
    ['no fraction, kept as sent', '2024-12-12T08:30:00Z', '2024-12-12T08:30:00Z'],
    ['microseconds', '2024-12-12T08:30:00.123456Z', '2024-12-12T08:30:00.123Z'],
    ['one fraction digit', '2024-12-12T08:30:00.5Z', '2024-12-12T08:30:00.500Z'],
    ['zero offset colon', '2024-12-12T08:30:00.123456+00:00', '2024-12-12T08:30:00.123Z'],
    ['positive offset', '2024-12-12T08:30:00+08:00', '2024-12-12T00:30:00.000Z'],
    ['negative offset', '2024-12-12T08:30:00-05:30', '2024-12-12T14:00:00.000Z'],
    ['offset without colon', '2024-12-12T08:30:00+0800', '2024-12-12T00:30:00.000Z'],
    ['lowercase markers', '2024-12-12t08:30:00z', '2024-12-12T08:30:00.000Z'],
    ['offset crossing midnight', '2024-01-01T01:00:00+02:00', '2023-12-31T23:00:00.000Z'],
    ['leap day', '2024-02-29T00:00:00Z', '2024-02-29T00:00:00Z'],
    ['year one, kept as sent', '0001-01-01T00:00:00Z', '0001-01-01T00:00:00Z'],
    ['year one with offset', '0001-01-01T08:00:00+08:00', '0001-01-01T00:00:00.000Z'],
    ['year one lowercase', '0001-01-01t00:00:00z', '0001-01-01T00:00:00.000Z'],
  ])('%s', (_, input, expected) => {
    expect(normalizeIsoDateTime(input)).toBe(expected);
  });

  test.each([
    ['date only', '2024-12-12'],
    ['no zone', '2024-12-12T08:30:00'],
    ['space separator', '2024-12-12 08:30:00Z'],
    ['month 13', '2024-13-01T00:00:00Z'],
    ['day 32', '2024-01-32T00:00:00Z'],
    ['non leap day', '2023-02-29T00:00:00Z'],
    ['hour 24', '2024-01-01T24:00:00Z'],
    ['second 60', '2024-01-01T00:00:60Z'],
    ['offset hour 15', '2024-01-01T00:00:00+15:00'],
    ['epoch number', 1733961600000],
    ['plain string', 'tomorrow'],
    ['null', null],
  ])('%s is rejected', (_, input) => {
    expect(normalizeIsoDateTime(input)).toBeUndefined();
  });
});

describe('coerceAttributeValue', () => {
  const S = BizAttributeTypes.String;
  const N = BizAttributeTypes.Number;
  const B = BizAttributeTypes.Boolean;
  const D = BizAttributeTypes.DateTime;
  const L = BizAttributeTypes.List;

  test.each([
    ['string → String', 'x', S, 'x'],
    ['iso string → String', '2024-12-12T00:00:00.000Z', S, '2024-12-12T00:00:00.000Z'],
    ['number → String', 12345678, S, '12345678'],
    ['float → String', 1.5, S, '1.5'],
    ['boolean → String', true, S, 'true'],
    ['number → Number', 42, N, 42],
    ['numeric string → Number', '42', N, 42],
    ['negative numeric string → Number', '-3.5', N, -3.5],
    ['boolean → Boolean', false, B, false],
    ["'true' → Boolean", 'true', B, true],
    ["'false' → Boolean", 'false', B, false],
    ['offset iso → DateTime', '2024-12-12T08:30:00+08:00', D, '2024-12-12T00:30:00.000Z'],
    ['list → List', ['a', 1], L, ['a', 1]],
    ['list with null holes → List', ['a', null, undefined, 'b'], L, ['a', 'b']],
    ['scalar → List', 'a', L, ['a']],
    ['number scalar → List', 7, L, [7]],
  ])('%s', (_, value, target, expected) => {
    expect(coerceAttributeValue(value, target)).toEqual({ ok: true, value: expected });
  });

  test.each([
    ['list → String', ['a'], S],
    ['object → String', { a: 1 }, S],
    ['lossy leading zero → Number', '007', N],
    ['exponent string → Number', '1e3', N],
    ['padded string → Number', ' 42', N],
    ['empty string → Number', '', N],
    ['non-numeric → Number', 'abc', N],
    ['Infinity → Number', Number.POSITIVE_INFINITY, N],
    ['boolean → Number', true, N],
    ["'yes' → Boolean", 'yes', B],
    ['1 → Boolean', 1, B],
    ['epoch → DateTime', 1733961600000, D],
    ['date only → DateTime', '2024-12-12', D],
    ['localised date → DateTime', '12/12/2024', D],
    ['nested list → List', [['a']], L],
    ['list holding an object → List', ['a', { b: 1 }], L],
    ['object → List', { a: 1 }, L],
    ['anything → Nil', 'x', BizAttributeTypes.Nil],
    ['anything → RandomAB', 'x', BizAttributeTypes.RandomAB],
  ])('%s is a mismatch', (_, value, target) => {
    expect(coerceAttributeValue(value, target)).toEqual({ ok: false });
  });
});

describe('applyAttributeWrite', () => {
  test('delete drops the key', () => {
    expect(applyAttributeWrite('x', parsed(null))).toBe(ATTRIBUTE_DELETE);
  });

  test.each([
    ['literal replaces', 'old', 'new', 'new'],
    ['literal sets absent', undefined, 'new', 'new'],
    ['set replaces', 'old', { set: 'new' }, 'new'],
  ])('%s', (_, current, value, expected) => {
    expect(applyAttributeWrite(current, parsed(value))).toEqual(expected);
  });

  describe('set_once', () => {
    test('writes when absent', () => {
      expect(applyAttributeWrite(undefined, parsed({ set_once: 'google' }))).toBe('google');
    });

    test('keeps the current value when present', () => {
      expect(applyAttributeWrite('direct', parsed({ set_once: 'google' }))).toBe('direct');
    });

    test('treats falsy stored values as present', () => {
      expect(applyAttributeWrite(0, parsed({ set_once: 5 }))).toBe(0);
      expect(applyAttributeWrite('', parsed({ set_once: 'x' }))).toBe('');
      expect(applyAttributeWrite(false, parsed({ set_once: true }))).toBe(false);
    });
  });

  describe('add', () => {
    test.each([
      ['absent starts at 0', undefined, 1, 1],
      ['increments', 4, 1, 5],
      ['negative decrements', 4, -1, 3],
      ['floats', 1.5, 0.25, 1.75],
    ])('%s', (_, current, delta, expected) => {
      expect(applyAttributeWrite(current, parsed({ add: delta }))).toBe(expected);
    });
  });

  describe('union', () => {
    test.each([
      ['absent starts empty', undefined, ['a'], ['a']],
      ['appends new elements in order', ['a'], ['b', 'c'], ['a', 'b', 'c']],
      ['skips present elements', ['a', 'b'], ['b', 'c'], ['a', 'b', 'c']],
      ['keeps existing order', ['b', 'a'], ['a'], ['b', 'a']],
      ['dedupes within the operand', [], ['a', 'a'], ['a']],
      ['distinguishes 1 from "1"', [1], ['1'], [1, '1']],
      [
        'a null hole in the stored list is dropped, not the list',
        ['admin', null],
        ['x'],
        ['admin', 'x'],
      ],
    ])('%s', (_, current, values, expected) => {
      expect(applyAttributeWrite(current, parsed({ union: values }))).toEqual(expected);
    });
  });

  describe('remove', () => {
    test('absent key stays absent', () => {
      expect(applyAttributeWrite(undefined, parsed({ remove: 'a' }))).toBe(ATTRIBUTE_DELETE);
    });

    test.each([
      ['removes every occurrence', ['a', 'b', 'a'], 'a', ['b']],
      ['removes several values', ['a', 'b', 'c'], ['a', 'c'], ['b']],
      ['missing value is a no-op', ['a'], 'z', ['a']],
      ['emptying keeps the list', ['a'], 'a', []],
      ['does not cross types', [1, '1'], 1, ['1']],
      [
        'a null hole in the stored list is dropped, not the list',
        ['admin', null, 'x'],
        'x',
        ['admin'],
      ],
    ])('%s', (_, current, values, expected) => {
      expect(applyAttributeWrite(current, parsed({ remove: values }))).toEqual(expected);
    });
  });
});

describe('client-side helpers', () => {
  const {
    attributeCacheChanged,
    isAttributeOperation,
    mergeAttributeCache,
    normalizeLegacyAttributeWrites,
  } = jest.requireActual('../attribute-write');

  test.each([
    ['operation object', { add: 1 }, true],
    ['empty object', {}, true],
    ['array', ['a'], false],
    ['Date', new Date(), false],
    ['string', 'x', false],
    ['null', null, false],
  ])('isAttributeOperation: %s', (_, value, expected) => {
    expect(isAttributeOperation(value)).toBe(expected);
  });

  test('mergeAttributeCache caches literals and drops operation keys', () => {
    const cache = { plan: 'free', count: 3, flags: ['a'] };
    expect(
      mergeAttributeCache(cache, {
        plan: 'pro',
        count: { add: 1 },
        flags: { union: 'b' },
        gone: null,
      }),
    ).toEqual({ plan: 'pro', gone: null });
  });

  test('attributeCacheChanged: an operation always counts as a change', () => {
    expect(attributeCacheChanged({ count: 3 }, { count: { add: 1 } })).toBe(true);
    expect(attributeCacheChanged({ count: 3 }, { count: 3 })).toBe(false);
    expect(attributeCacheChanged({ count: 3 }, { count: 4 })).toBe(true);
    expect(attributeCacheChanged({}, { when: new Date(0) })).toBe(true);
    expect(attributeCacheChanged({ when: new Date(0) }, { when: new Date(0) })).toBe(false);
  });

  describe('normalizeLegacyAttributeWrites', () => {
    test('rewrites subtract, append, prepend and a numeric add string', () => {
      const rewrites: unknown[] = [];
      const result = normalizeLegacyAttributeWrites(
        {
          days_left: { subtract: 1 },
          credits: { subtract: '2.5' },
          tags: { append: ['a'] },
          first: { prepend: 'z' },
          hits: { add: '3' },
          plan: 'pro',
          keep: { set_once: 'x' },
        },
        (rewrite: unknown) => rewrites.push(rewrite),
      );
      expect(result).toEqual({
        days_left: { add: -1 },
        credits: { add: -2.5 },
        tags: { union: ['a'] },
        first: { union: 'z' },
        hits: { add: 3 },
        plan: 'pro',
        keep: { set_once: 'x' },
      });
      // A numeric `add` string is corrected, not reported: `add` is not deprecated.
      expect(rewrites).toEqual([
        { codeName: 'days_left', from: 'subtract', to: 'add' },
        { codeName: 'credits', from: 'subtract', to: 'add' },
        { codeName: 'tags', from: 'append', to: 'union' },
        { codeName: 'first', from: 'prepend', to: 'union' },
      ]);
    });

    test('leaves everything else untouched, returning the same object when nothing changed', () => {
      const input = {
        plain: 'x',
        unknown: { foo: 1 },
        two: { subtract: 1, append: 'x' },
        badAdd: { add: 'abc' },
        badSubtract: { subtract: 'abc' },
      };
      expect(normalizeLegacyAttributeWrites(input)).toBe(input);
    });
  });
});
