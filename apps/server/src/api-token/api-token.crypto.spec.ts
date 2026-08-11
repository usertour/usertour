import {
  API_TOKEN_PREFIX,
  OAUTH_TOKEN_PREFIX,
  composeApiToken,
  hashApiTokenSecret,
  stripTokenPrefix,
} from './api-token.crypto';

describe('stripTokenPrefix', () => {
  it('accepts a personal (utp_) token and returns the bare secret', () => {
    expect(stripTokenPrefix(`${API_TOKEN_PREFIX}abc123`)).toBe('abc123');
  });

  it('accepts an OAuth-issued (uto_) token and returns the bare secret', () => {
    expect(stripTokenPrefix(`${OAUTH_TOKEN_PREFIX}abc123`)).toBe('abc123');
  });

  it('returns null for an unknown / missing prefix', () => {
    expect(stripTokenPrefix('xyz_abc123')).toBeNull();
    expect(stripTokenPrefix('abc123')).toBeNull();
    expect(stripTokenPrefix('')).toBeNull();
  });

  it('utp_ and uto_ over the same secret hash to the same value (prefix-agnostic lookup)', () => {
    const secret = 'same-secret';
    const utp = stripTokenPrefix(composeApiToken(secret));
    const uto = stripTokenPrefix(`${OAUTH_TOKEN_PREFIX}${secret}`);
    expect(utp).toBe(uto);
    expect(hashApiTokenSecret(utp as string)).toBe(hashApiTokenSecret(uto as string));
  });
});
