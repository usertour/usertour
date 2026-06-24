import * as dns from 'node:dns';

import {
  assertPublicHttpUrl,
  createGuardedHttpsAgent,
  guardedLookup,
  isBlockedAddress,
} from './egress-guard';

// Mock node:dns so the hostname path can be driven without real resolution.
jest.mock('node:dns', () => ({ lookup: jest.fn() }));

describe('isBlockedAddress', () => {
  it('allows globally-routable unicast IPv4', () => {
    expect(isBlockedAddress('8.8.8.8')).toBe(false);
    expect(isBlockedAddress('1.1.1.1')).toBe(false);
  });

  it('blocks loopback / private / link-local IPv4', () => {
    expect(isBlockedAddress('127.0.0.1')).toBe(true);
    expect(isBlockedAddress('10.0.0.5')).toBe(true);
    expect(isBlockedAddress('172.16.0.1')).toBe(true);
    expect(isBlockedAddress('172.31.255.255')).toBe(true);
    expect(isBlockedAddress('192.168.1.1')).toBe(true);
    // Cloud metadata endpoint — the single most important address to refuse.
    expect(isBlockedAddress('169.254.169.254')).toBe(true);
  });

  it('does not over-block public 172.x outside the private /12', () => {
    expect(isBlockedAddress('172.15.255.255')).toBe(false);
    expect(isBlockedAddress('172.32.0.1')).toBe(false);
  });

  it('blocks loopback / unique-local / link-local IPv6', () => {
    expect(isBlockedAddress('::1')).toBe(true);
    expect(isBlockedAddress('fc00::1')).toBe(true);
    expect(isBlockedAddress('fd12:3456:789a::1')).toBe(true);
    expect(isBlockedAddress('fe80::1')).toBe(true);
  });

  it('allows globally-routable unicast IPv6', () => {
    expect(isBlockedAddress('2606:4700:4700::1111')).toBe(false);
  });

  it('unwraps IPv4-mapped IPv6 before vetting', () => {
    expect(isBlockedAddress('::ffff:169.254.169.254')).toBe(true);
    expect(isBlockedAddress('::ffff:127.0.0.1')).toBe(true);
    expect(isBlockedAddress('::ffff:8.8.8.8')).toBe(false);
  });

  it('refuses unparseable input defensively', () => {
    expect(isBlockedAddress('not-an-ip')).toBe(true);
    expect(isBlockedAddress('')).toBe(true);
  });
});

// The bypass the lookup hook cannot cover: Node skips DNS (and thus `lookup`)
// for IP-literal hosts, so a literal internal IP — typed directly as a target
// or returned as an endpoint in a discovery document — must be refused at the
// connection layer instead.
describe('GuardedHttpsAgent.createConnection — direct IP literals', () => {
  it('synchronously refuses the cloud metadata IP without connecting', (done) => {
    const agent = createGuardedHttpsAgent() as unknown as {
      createConnection: (opts: unknown, cb: (err: Error | null) => void) => unknown;
    };
    const result = agent.createConnection({ host: '169.254.169.254', port: 443 }, (err) => {
      expect(err).toBeInstanceOf(Error);
      done();
    });
    // No socket is created for a refused address.
    expect(result).toBeUndefined();
  });

  it('refuses loopback and private IP literals', (done) => {
    const agent = createGuardedHttpsAgent() as unknown as {
      createConnection: (opts: unknown, cb: (err: Error | null) => void) => unknown;
    };
    let seen = 0;
    const expectRefused = (err: Error | null) => {
      expect(err).toBeInstanceOf(Error);
      seen += 1;
      if (seen === 2) {
        done();
      }
    };
    agent.createConnection({ host: '127.0.0.1', port: 443 }, expectRefused);
    agent.createConnection({ host: '10.0.0.5', port: 443 }, expectRefused);
  });

  it('refuses an IPv4-mapped IPv6 literal', (done) => {
    const agent = createGuardedHttpsAgent() as unknown as {
      createConnection: (opts: unknown, cb: (err: Error | null) => void) => unknown;
    };
    agent.createConnection({ host: '::ffff:127.0.0.1', port: 443 }, (err) => {
      expect(err).toBeInstanceOf(Error);
      done();
    });
  });
});

// Fast-fail / pre-request check. Not the security boundary (that's the agent +
// lookup above) — just rejects the obvious misconfigurations early and clearly,
// and is fully inert when the deployment permits private-network egress.
describe('assertPublicHttpUrl', () => {
  const restricted = { allowPrivateNetwork: false };
  const permitted = { allowPrivateNetwork: true };

  it('allows a public HTTPS URL when restricted', () => {
    expect(() => assertPublicHttpUrl('https://example.okta.com', restricted)).not.toThrow();
    expect(() => assertPublicHttpUrl('https://8.8.8.8/x', restricted)).not.toThrow();
  });

  it('refuses a non-HTTPS URL when restricted', () => {
    expect(() => assertPublicHttpUrl('http://example.okta.com', restricted)).toThrow();
  });

  it('refuses localhost and *.localhost when restricted', () => {
    expect(() => assertPublicHttpUrl('https://localhost/auth', restricted)).toThrow();
    expect(() => assertPublicHttpUrl('https://app.localhost/auth', restricted)).toThrow();
  });

  it('refuses internal IP literals when restricted (v4, bracketed v6, mapped)', () => {
    expect(() => assertPublicHttpUrl('https://169.254.169.254/x', restricted)).toThrow();
    expect(() => assertPublicHttpUrl('https://127.0.0.1/x', restricted)).toThrow();
    expect(() => assertPublicHttpUrl('https://10.0.0.5/x', restricted)).toThrow();
    expect(() => assertPublicHttpUrl('https://[::1]/x', restricted)).toThrow();
  });

  it('refuses an unparseable URL when restricted', () => {
    expect(() => assertPublicHttpUrl('not a url', restricted)).toThrow();
  });

  it('is inert when private-network egress is permitted', () => {
    expect(() => assertPublicHttpUrl('http://localhost:8080/realms/x', permitted)).not.toThrow();
    expect(() => assertPublicHttpUrl('http://10.0.0.5/realms/x', permitted)).not.toThrow();
  });
});

// The hostname path: a public-looking name that resolves to an internal IP must
// be refused, and a public resolution must be pinned (handed back verbatim so
// the socket cannot re-resolve to something else).
describe('guardedLookup — hostname resolution', () => {
  const mockLookup = dns.lookup as unknown as jest.Mock;

  afterEach(() => {
    mockLookup.mockReset();
  });

  it('refuses a hostname that resolves to an internal IP', (done) => {
    mockLookup.mockImplementation((_host, _opts, cb) => cb(null, '10.0.0.5', 4));
    guardedLookup('intranet.example.com', {}, (err) => {
      expect(err).toBeInstanceOf(Error);
      done();
    });
  });

  it('allows a public resolution and pins the vetted address', (done) => {
    mockLookup.mockImplementation((_host, _opts, cb) => cb(null, '93.184.216.34', 4));
    guardedLookup('example.com', {}, (err, address) => {
      expect(err).toBeNull();
      expect(address).toBe('93.184.216.34');
      done();
    });
  });
});
