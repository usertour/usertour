import { isUnambiguousIsoDate, nameContains } from './filters';

describe('nameContains', () => {
  it('builds a case-insensitive substring filter from a term', () => {
    expect(nameContains('Onboarding')).toEqual({ contains: 'Onboarding', mode: 'insensitive' });
  });

  it('trims surrounding whitespace', () => {
    expect(nameContains('  Live  ')).toEqual({ contains: 'Live', mode: 'insensitive' });
  });

  it('returns undefined for empty / whitespace-only / undefined (no filter)', () => {
    expect(nameContains(undefined)).toBeUndefined();
    expect(nameContains('')).toBeUndefined();
    expect(nameContains('   ')).toBeUndefined();
  });
});

describe('isUnambiguousIsoDate — deployment-independent instants only', () => {
  it('accepts a date-only string (spec-parsed as UTC everywhere)', () => {
    expect(isUnambiguousIsoDate('2026-07-10')).toBe(true);
  });

  it('accepts datetimes WITH an explicit timezone', () => {
    expect(isUnambiguousIsoDate('2026-07-10T00:00:00Z')).toBe(true);
    expect(isUnambiguousIsoDate('2026-07-10T08:00:00+08:00')).toBe(true);
    expect(isUnambiguousIsoDate('2026-07-10T08:00:00.123-0530')).toBe(true);
  });

  it('REJECTS a timezone-less datetime (parses in the server local zone → range shifts per deployment)', () => {
    expect(isUnambiguousIsoDate('2026-07-10T00:00:00')).toBe(false);
    expect(isUnambiguousIsoDate('2026-07-10T00:00')).toBe(false);
  });

  it('rejects non-ISO garbage even when Date.parse would accept it locally', () => {
    expect(isUnambiguousIsoDate('07/10/2026')).toBe(false);
    expect(isUnambiguousIsoDate('not-a-date')).toBe(false);
    expect(isUnambiguousIsoDate('2026-13-40')).toBe(false); // regex-shaped but unparseable
  });
});
