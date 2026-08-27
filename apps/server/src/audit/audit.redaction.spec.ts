import { redactSnapshot, snapshotPolicy } from './audit.redaction';

describe('audit snapshot policy', () => {
  it('maps config resources to full, PII resources to redacted, recoverable to none', () => {
    expect(snapshotPolicy('segment')).toBe('full');
    expect(snapshotPolicy('theme')).toBe('full');
    expect(snapshotPolicy('user')).toBe('redacted');
    expect(snapshotPolicy('company')).toBe('redacted');
    expect(snapshotPolicy('content')).toBe('none');
    // An environment rename has no history anywhere else (no version history) —
    // unlike content, it snapshots despite being soft-deletable.
    expect(snapshotPolicy('environment')).toBe('full');
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
  });

  it('keeps environment snapshots but blanks the token (global SECRET_KEYS)', () => {
    expect(redactSnapshot('environment', { id: 'e1', name: 'Dev', token: 'ak_x' })).toEqual({
      id: 'e1',
      name: 'Dev',
      token: '[redacted]',
    });
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

  it('blanks the signing secret in both create results and row snapshots', () => {
    // createSigningSecret result: plaintext utv_ secret at the top level.
    expect(
      redactSnapshot('signing_secret', {
        id: 'ss1',
        environmentId: 'env1',
        secret: 'utv_plaintext',
        revokedAt: null,
      }),
    ).toEqual({
      id: 'ss1',
      environmentId: 'env1',
      secret: '[redacted]',
      revokedAt: null,
    });
    // before-snapshot on revoke: the row carries the encrypted secret — same rule.
    expect(redactSnapshot('signing_secret', { id: 'ss1', secret: 'enc:v1:...' })).toEqual({
      id: 'ss1',
      secret: '[redacted]',
    });
  });

  it('blanks the integration credential (per-type keys)', () => {
    expect(
      redactSnapshot('integration', {
        id: 'i1',
        provider: 'mixpanel',
        key: 'enc:v1:...',
        keyTail: 'f2a1',
        config: { region: 'EU' },
        enabled: true,
      }),
    ).toEqual({
      id: 'i1',
      provider: 'mixpanel',
      key: '[redacted]',
      keyTail: 'f2a1',
      config: { region: 'EU' },
      enabled: true,
    });
    // `key` is NOT stripped on other resource types (too generic globally)
    expect(redactSnapshot('segment', { id: 's1', key: 'k1' })).toEqual({
      id: 's1',
      key: 'k1',
    });
  });

  it('strips secret keys at ANY depth, arrays included (a nested include must not leak)', () => {
    // The one-step-away scenario: a write handler adds an `include:` and the
    // relation carries a credential under a global SECRET_KEY name.
    expect(
      redactSnapshot('integration', {
        id: 'i1',
        environment: { signingSecrets: [{ secret: 'plain', name: 'default' }] },
      }),
    ).toEqual({
      id: 'i1',
      environment: { signingSecrets: [{ secret: '[redacted]', name: 'default' }] },
    });
    // Arrays used to bypass redaction entirely.
    expect(
      redactSnapshot('segment', { id: 's1', items: [{ token: 'x' }, { name: 'ok' }] }),
    ).toEqual({
      id: 's1',
      items: [{ token: '[redacted]' }, { name: 'ok' }],
    });
    // Nested object one level down.
    expect(redactSnapshot('segment', { auth: { token: 'x', region: 'eu' } })).toEqual({
      auth: { token: '[redacted]', region: 'eu' },
    });
  });

  it('strips PII blobs at any depth for redacted-policy resources, not for full', () => {
    // e.g. a future expand nesting memberships with their attribute blobs.
    expect(
      redactSnapshot('user', {
        externalId: 'e1',
        memberships: [{ id: 'm1', attributes: { role: 'admin' } }],
      }),
    ).toEqual({
      externalId: 'e1',
      memberships: [{ id: 'm1', attributes: '[redacted]' }],
    });
    // Full-policy resources keep their `data` (the segment definition IS the data).
    expect(redactSnapshot('segment', { id: 's1', data: { foo: 'bar' } })).toEqual({
      id: 's1',
      data: { foo: 'bar' },
    });
  });

  it('keeps Date leaves intact instead of recursing into them', () => {
    const createdAt = new Date('2026-01-01T00:00:00Z');
    expect(redactSnapshot('segment', { id: 's1', createdAt })).toEqual({ id: 's1', createdAt });
  });

  it('blanks the project license and the OAuth grace-period hash (SECRET_KEYS additions)', () => {
    expect(redactSnapshot('project', { id: 'p1', name: 'Acme', license: 'jwt...' })).toEqual({
      id: 'p1',
      name: 'Acme',
      license: '[redacted]',
    });
    expect(redactSnapshot('oauth_grant', { id: 'g1', previousHashedRefreshToken: 'sha' })).toEqual({
      id: 'g1',
      previousHashedRefreshToken: '[redacted]',
    });
  });
});
