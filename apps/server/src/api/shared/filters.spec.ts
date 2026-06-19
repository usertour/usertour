import { nameContains } from './filters';

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
