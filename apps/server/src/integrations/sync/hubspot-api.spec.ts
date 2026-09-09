import { AxiosError, AxiosHeaders } from 'axios';
import { isHubspotGrantRevoked } from './hubspot-api';

const tokenFailure = (status: number, data: unknown) =>
  new AxiosError('request failed', 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    statusText: '',
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
    data,
  });

describe('isHubspotGrantRevoked', () => {
  it('recognises the documented dead-refresh-token body by either marker', () => {
    expect(
      isHubspotGrantRevoked(
        tokenFailure(400, { error: 'invalid_grant', status: 'BAD_REFRESH_TOKEN' }),
      ),
    ).toBe(true);
    expect(isHubspotGrantRevoked(tokenFailure(400, { status: 'BAD_REFRESH_TOKEN' }))).toBe(true);
    expect(isHubspotGrantRevoked(tokenFailure(400, '{"error":"invalid_grant"}'))).toBe(true);
    expect(isHubspotGrantRevoked(tokenFailure(401, {}))).toBe(true);
  });

  it('does not mistake a misconfigured app for a revoked grant', () => {
    expect(
      isHubspotGrantRevoked(
        tokenFailure(400, { error: 'invalid_client', status: 'BAD_CLIENT_ID' }),
      ),
    ).toBe(false);
    expect(isHubspotGrantRevoked(tokenFailure(500, {}))).toBe(false);
    expect(isHubspotGrantRevoked(new Error('boom'))).toBe(false);
  });
});
