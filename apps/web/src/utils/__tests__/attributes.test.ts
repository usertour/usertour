import { attributeNumber, attributeText, attributeTextList } from '../attributes';

describe('attributeText', () => {
  it('reads nothing as empty', () => {
    expect(attributeText(undefined)).toBe('');
    expect(attributeText(null)).toBe('');
  });

  it('reads scalars as their text', () => {
    expect(attributeText('Admin')).toBe('Admin');
    expect(attributeText(0)).toBe('0');
    expect(attributeText(false)).toBe('false');
  });

  it('joins a list and drops its null entries', () => {
    expect(attributeText(['a', null, 2])).toBe('a; 2');
  });
});

describe('attributeNumber', () => {
  it('keeps a number, including zero', () => {
    expect(attributeNumber(0)).toBe(0);
    expect(attributeNumber(7)).toBe(7);
  });

  it('parses numeric text and rejects the rest', () => {
    expect(attributeNumber('3')).toBe(3);
    expect(attributeNumber(' ')).toBeUndefined();
    expect(attributeNumber('three')).toBeUndefined();
    expect(attributeNumber(true)).toBeUndefined();
    expect(attributeNumber(null)).toBeUndefined();
    expect(attributeNumber(['3'])).toBeUndefined();
  });
});

describe('attributeTextList', () => {
  it('lists a scalar, keeps a list, drops nulls', () => {
    expect(attributeTextList('a')).toEqual(['a']);
    expect(attributeTextList(['a', null, 2])).toEqual(['a', '2']);
    expect(attributeTextList(null)).toEqual([]);
  });
});
