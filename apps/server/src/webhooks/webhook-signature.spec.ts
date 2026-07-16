import { createHmac } from 'node:crypto';
import { generateWebhookSecret, signWebhookPayload } from './webhook-signature';

describe('signWebhookPayload', () => {
  const secret = 'whsec_test';
  const timestamp = 1752652800;
  const body = '{"id":"whmsg_1","object":"webhookMessage"}';

  it('produces the documented t=,v1= format over "{t}.{body}"', () => {
    const expectedMac = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');

    expect(signWebhookPayload(secret, timestamp, body)).toBe(`t=${timestamp},v1=${expectedMac}`);
  });

  it('is a known stable vector (receiver-side verification contract)', () => {
    expect(signWebhookPayload(secret, timestamp, body)).toBe(
      't=1752652800,v1=153783454684e83f24a743b653fb3fb6c41dc90c0a54d122b2c207f4c93446a6',
    );
  });

  it('changes when the body is tampered with', () => {
    const original = signWebhookPayload(secret, timestamp, body);
    const tampered = signWebhookPayload(secret, timestamp, `${body} `);
    expect(tampered).not.toBe(original);
  });
});

describe('generateWebhookSecret', () => {
  it('generates a unique whsec_-prefixed 32-byte hex secret', () => {
    const secret = generateWebhookSecret();
    expect(secret).toMatch(/^whsec_[0-9a-f]{64}$/);
    expect(generateWebhookSecret()).not.toBe(secret);
  });
});
