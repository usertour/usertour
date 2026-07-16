import { redactPayloadForLogging } from './web-socket-v2-message-handler';

describe('redactPayloadForLogging', () => {
  it('masks the identity token so error logs never persist a bearer credential', () => {
    const payload = {
      externalUserId: 'user-1',
      externalCompanyId: 'company-9',
      token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyLTEifQ.signature',
      attributes: { name: 'Acme' },
    };
    const redacted = redactPayloadForLogging(payload) as Record<string, unknown>;
    expect(redacted.token).toBe('[REDACTED]');
    expect(redacted.externalUserId).toBe('user-1');
    expect(redacted.attributes).toEqual({ name: 'Acme' });
    // The original payload must not be mutated — it is still in use.
    expect(payload.token).toContain('eyJ');
  });

  it('returns tokenless payloads unchanged', () => {
    const payload = { externalUserId: 'user-1', attributes: {} };
    expect(redactPayloadForLogging(payload)).toBe(payload);
  });

  it('passes through non-object payloads', () => {
    expect(redactPayloadForLogging(undefined)).toBeUndefined();
    expect(redactPayloadForLogging('raw')).toBe('raw');
    expect(redactPayloadForLogging([1, 2])).toEqual([1, 2]);
  });
});
