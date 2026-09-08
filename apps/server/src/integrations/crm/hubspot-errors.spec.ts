import { AxiosError, AxiosHeaders } from 'axios';
import { HubspotRateLimitError, hubspotCall } from './hubspot-errors';

const axiosFailure = (status: number, headers: Record<string, string> = {}) =>
  new AxiosError('request failed', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
    statusText: '',
    headers: new AxiosHeaders(headers),
    config: { headers: new AxiosHeaders() },
    data: { error: status === 400 ? 'invalid_grant' : undefined },
  });

const failWith = (error: unknown) => hubspotCall(() => Promise.reject(error));

describe('hubspotCall', () => {
  it('returns the call result', async () => {
    await expect(hubspotCall(async () => 42)).resolves.toBe(42);
  });

  it('turns a 429 with delta-seconds Retry-After into a rate limit error', async () => {
    const error = await failWith(axiosFailure(429, { 'retry-after': '7' })).catch((e) => e);
    expect(error).toBeInstanceOf(HubspotRateLimitError);
    expect(error).toMatchObject({ status: 429, retryAfterMs: 7000 });
  });

  it('parses an HTTP-date Retry-After', async () => {
    const at = new Date(Date.now() + 90_000).toUTCString();
    const error = await failWith(axiosFailure(429, { 'retry-after': at })).catch((e) => e);
    expect(error).toBeInstanceOf(HubspotRateLimitError);
    expect(error.retryAfterMs).toBeGreaterThan(60_000);
    expect(error.retryAfterMs).toBeLessThanOrEqual(90_000);
  });

  it('treats a momentary 502/503 without a header as a short pause', async () => {
    const error = await failWith(axiosFailure(503)).catch((e) => e);
    expect(error).toMatchObject({ status: 503, retryAfterMs: 10_000 });
  });

  it('passes every other failure through, so grant checks still see the response', async () => {
    const revoked = axiosFailure(400);
    await expect(failWith(revoked)).rejects.toBe(revoked);
    expect(revoked.response?.status).toBe(400);
    const plain = new Error('boom');
    await expect(failWith(plain)).rejects.toBe(plain);
  });

  it('strips the request from a failed call: secrets never ride an error into a log', async () => {
    const failure = axiosFailure(400);
    failure.config = {
      headers: new AxiosHeaders(),
      data: 'client_secret=shh&refresh_token=shh',
    } as never;
    await expect(failWith(failure)).rejects.toBe(failure);
    expect(failure.config).toBeUndefined();
    expect(failure.request).toBeUndefined();
    expect(JSON.stringify(failure)).not.toContain('shh');
  });
});
