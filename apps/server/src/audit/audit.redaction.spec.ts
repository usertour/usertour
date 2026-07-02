import { redactSnapshot, snapshotPolicy } from './audit.redaction';

describe('audit snapshot policy', () => {
  it('maps config resources to full, PII resources to redacted, recoverable to none', () => {
    expect(snapshotPolicy('segment')).toBe('full');
    expect(snapshotPolicy('theme')).toBe('full');
    expect(snapshotPolicy('user')).toBe('redacted');
    expect(snapshotPolicy('company')).toBe('redacted');
    expect(snapshotPolicy('content')).toBe('none');
    expect(snapshotPolicy('environment')).toBe('none');
  });

  it('defaults an unknown resource to full (capture, do not silently drop)', () => {
    expect(snapshotPolicy('something-new')).toBe('full');
  });
});

describe('redactSnapshot', () => {
  it('keeps the full snapshot for config resources', () => {
    const segment = { id: 's1', name: 'Power users', data: { foo: 'bar' } };
    expect(redactSnapshot('segment', segment)).toEqual(segment);
  });

  it('strips PII attribute blobs for redacted resources, keeping ids', () => {
    const user = { id: 'u1', externalId: 'ext-1', data: { email: 'a@b.com', name: 'Ada' } };
    expect(redactSnapshot('user', user)).toEqual({
      id: 'u1',
      externalId: 'ext-1',
      data: '[redacted]',
    });
  });

  it('redacts an `attributes` blob too', () => {
    const user = { externalId: 'ext-1', attributes: { phone: '123' } };
    expect(redactSnapshot('user', user)).toEqual({ externalId: 'ext-1', attributes: '[redacted]' });
  });

  it('returns undefined for none-policy resources (no snapshot stored)', () => {
    expect(redactSnapshot('content', { id: 'c1' })).toBeUndefined();
    expect(redactSnapshot('environment', { id: 'e1' })).toBeUndefined();
  });

  it('returns undefined for null/absent values', () => {
    expect(redactSnapshot('segment', null)).toBeUndefined();
    expect(redactSnapshot('user', undefined)).toBeUndefined();
  });

  it('strips credential keys from EVERY stored snapshot, regardless of policy', () => {
    // createApiToken/rotateApiToken result: plaintext token at the top level.
    expect(redactSnapshot('api_token', { apiToken: { id: 'k1' }, token: 'utp_secret' })).toEqual({
      apiToken: { id: 'k1' },
      token: '[redacted]',
    });
    // ApiToken row (before-snapshot on update/delete) carries the hash.
    expect(redactSnapshot('api_token', { id: 'k1', name: 'CI', hashedSecret: 'sha' })).toEqual({
      id: 'k1',
      name: 'CI',
      hashedSecret: '[redacted]',
    });
    // OAuth grant refresh lineage + SSO client secret.
    expect(redactSnapshot('oauth_grant', { id: 'g1', hashedRefreshToken: 'sha' })).toEqual({
      id: 'g1',
      hashedRefreshToken: '[redacted]',
    });
    expect(redactSnapshot('sso_provider', { id: 'p1', clientSecret: 's3cr3t' })).toEqual({
      id: 'p1',
      clientSecret: '[redacted]',
    });
    // even on a 'redacted'-policy resource, a stray credential key is stripped too
    expect(redactSnapshot('user', { externalId: 'e1', token: 'x' })).toEqual({
      externalId: 'e1',
      token: '[redacted]',
    });
  });
});
