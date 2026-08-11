import { createdAtWhere, isUnambiguousIsoDate, nameContains } from './filters';

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

describe('createdAtWhere — day-inclusion semantics of the range bounds', () => {
  it('returns {} when neither bound is set', () => {
    expect(createdAtWhere()).toEqual({});
  });

  it("a date-only createdAfter starts at that day's FIRST instant (UTC)", () => {
    const { createdAt } = createdAtWhere('2026-07-01', undefined);
    expect(createdAt?.gte?.toISOString()).toBe('2026-07-01T00:00:00.000Z');
  });

  it('a date-only createdBefore includes the ENTIRE named day (documented inclusive)', () => {
    // lte at midnight would silently drop every record created ON the day —
    // the exact trap the v2 analytics endDate normalization already avoids.
    const { createdAt } = createdAtWhere(undefined, '2026-07-10');
    expect(createdAt?.lte?.toISOString()).toBe('2026-07-10T23:59:59.999Z');
  });

  it('explicit timestamps pass through untouched on both bounds', () => {
    const { createdAt } = createdAtWhere('2026-07-01T06:30:00Z', '2026-07-10T18:00:00+08:00');
    expect(createdAt?.gte?.toISOString()).toBe('2026-07-01T06:30:00.000Z');
    expect(createdAt?.lte?.toISOString()).toBe('2026-07-10T10:00:00.000Z');
  });
});
