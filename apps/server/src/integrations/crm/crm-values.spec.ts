import { BizAttributeTypes } from '@usertour/types';
import { localToRemoteValue, remoteToLocalValue } from './crm-values';

describe('crm-values', () => {
  describe('remoteToLocalValue', () => {
    it('clears on empty input', () => {
      expect(remoteToLocalValue('', BizAttributeTypes.String)).toBeNull();
      expect(remoteToLocalValue(null, BizAttributeTypes.Number)).toBeNull();
    });

    it('parses numbers and booleans, nulling garbage', () => {
      expect(remoteToLocalValue('42.5', BizAttributeTypes.Number)).toBe(42.5);
      expect(remoteToLocalValue('abc', BizAttributeTypes.Number)).toBeNull();
      expect(remoteToLocalValue('true', BizAttributeTypes.Boolean)).toBe(true);
      expect(remoteToLocalValue('yes', BizAttributeTypes.Boolean)).toBeNull();
    });

    it('normalizes dates and epoch millis to ISO 8601 UTC', () => {
      expect(remoteToLocalValue('2026-09-03', BizAttributeTypes.DateTime)).toBe(
        '2026-09-03T00:00:00.000Z',
      );
      expect(remoteToLocalValue('1756857600000', BizAttributeTypes.DateTime)).toBe(
        '2025-09-03T00:00:00.000Z',
      );
      expect(remoteToLocalValue('not a date', BizAttributeTypes.DateTime)).toBeNull();
    });

    it('splits multi-select values into a list', () => {
      expect(remoteToLocalValue('a; b;;c', BizAttributeTypes.List)).toEqual(['a', 'b', 'c']);
    });
  });

  describe('localToRemoteValue', () => {
    it('serializes typed values for the provider', () => {
      expect(localToRemoteValue(199, 'number')).toBe('199');
      expect(localToRemoteValue('x', 'number')).toBeNull();
      expect(localToRemoteValue(false, 'bool')).toBe('false');
      expect(localToRemoteValue('2026-09-03T06:00:00.000Z', 'date')).toBe('2026-09-03');
      expect(localToRemoteValue('2026-09-03T06:00:00.000Z', 'datetime')).toBe(
        '2026-09-03T06:00:00.000Z',
      );
      expect(localToRemoteValue(['a', 'b'], 'string')).toBe('a;b');
      expect(localToRemoteValue(null, 'string')).toBeNull();
    });
  });
});
