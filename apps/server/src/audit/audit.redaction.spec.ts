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
});
