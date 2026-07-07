import { stripTokenPrefix } from '@/api-token/api-token.crypto';

import {
  accessTokenSecret,
  composeOAuthAccessToken,
  composeOAuthRefreshToken,
  hashSecret,
  refreshTokenSecret,
  tokenFingerprint,
} from './oauth.crypto';

// The storage rule: EVERY prefixed token's DB fingerprint is the hash of its BARE
// secret. These lock that rule so a future edit can't reintroduce the
// "refresh stored with prefix, access without" drift that broke revocation.
describe('token fingerprint (one storage rule: hash the bare secret)', () => {
  const secret = 'abc123SECRETxyz';
  const access = composeOAuthAccessToken(secret); // uto_abc123…
  const refresh = composeOAuthRefreshToken(secret); // utr_abc123…

  it('fingerprints access AND refresh tokens to the hash of the bare secret', () => {
    const expected = hashSecret(secret);
    expect(tokenFingerprint(access)).toBe(expected);
    expect(tokenFingerprint(refresh)).toBe(expected);
  });

  it('never fingerprints the prefixed string (the old bug)', () => {
    // Hashing the whole `utr_…` string must NOT be what we store.
    expect(tokenFingerprint(refresh)).not.toBe(hashSecret(refresh));
  });

  it('returns null for a token with no recognized prefix', () => {
    expect(tokenFingerprint('no_prefix_here')).toBeNull();
    expect(tokenFingerprint('')).toBeNull();
  });

  it('refreshTokenSecret strips only utr_ (and rejects access tokens)', () => {
    expect(refreshTokenSecret(refresh)).toBe(secret);
    expect(refreshTokenSecret(access)).toBeNull();
    expect(refreshTokenSecret('utr_')).toBeNull(); // empty secret
  });

  // The security boundary: a refresh token must NOT be strippable by the API-token
  // guard's helper, or it could be replayed as a bearer/access token.
  it('the guard helper (stripTokenPrefix) does NOT accept utr_ refresh tokens', () => {
    expect(stripTokenPrefix(refresh)).toBeNull();
    expect(accessTokenSecret(refresh)).toBeNull();
    // …but it does accept a uto_ access token.
    expect(stripTokenPrefix(access)).toBe(secret);
  });
});
