import * as dns from 'node:dns';
import * as https from 'node:https';
import * as net from 'node:net';
import type { LookupFunction } from 'node:net';
import { URL } from 'node:url';

import * as ipaddr from 'ipaddr.js';

import { EgressUrlNotAllowedError } from '@/common/errors';

/**
 * Egress guard against server-side request forgery (SSRF).
 *
 * Any feature that fetches a user-controlled URL — SSO issuer discovery today,
 * webhooks / URL imports later — can be steered at an internal host or a cloud
 * metadata endpoint. This module is the shared, feature-agnostic machinery for
 * refusing that, in three layers:
 *
 *  - {@link assertPublicHttpUrl} — fast-fail check at config time (HTTPS-only,
 *    no plainly-internal host). Convenience, NOT a boundary on its own.
 *  - {@link guardedLookup} — vets the DNS result for hostname requests and pins
 *    the vetted IP, closing the DNS-rebinding race. The real boundary.
 *  - {@link createGuardedHttpsAgent} — vets IP-literal hosts, which Node never
 *    routes through `lookup`. The other half of the real boundary.
 *
 * Whether the guard is active is a deployment policy — `allowPrivateNetwork`,
 * decoupled from cloud/self-host (config `globalConfig.allowPrivateNetworkEgress`).
 * Each consumer mounts the lookup + agent onto its own HTTP client.
 */

/**
 * True when `ip` must not be dialed by the server — loopback, private,
 * link-local (incl. 169.254.169.254 cloud metadata), unique-local, multicast,
 * and every other reserved range. Only globally-routable unicast is allowed.
 *
 * IPv4-mapped IPv6 (e.g. ::ffff:169.254.169.254) is unwrapped to its IPv4 form
 * first, otherwise a mapped internal address would slip past the range check.
 */
export const isBlockedAddress = (ip: string): boolean => {
  if (!ipaddr.isValid(ip)) {
    // Not parseable as an IP — refuse defensively rather than guess.
    return true;
  }
  let addr = ipaddr.parse(ip);
  if (addr.kind() === 'ipv6') {
    const v6 = addr as ipaddr.IPv6;
    if (v6.isIPv4MappedAddress()) {
      addr = v6.toIPv4Address();
    }
  }
  return addr.range() !== 'unicast';
};

/**
 * Fail-fast / explicit check on a user-controlled URL at config or
 * pre-request time — NOT the security boundary.
 *
 * It refuses the obvious mistakes: a non-HTTPS URL, or a plainly internal host
 * (an IP literal in a blocked range, or localhost). It does NOT resolve DNS —
 * a hostname that resolves to an internal IP, DNS rebinding, and the endpoints
 * a discovery document returns are all caught at request time by the lookup +
 * agent. No-op when the deployment permits private-network egress.
 */
export const assertPublicHttpUrl = (
  rawUrl: string,
  options: { allowPrivateNetwork: boolean },
): void => {
  if (options.allowPrivateNetwork) {
    return;
  }
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new EgressUrlNotAllowedError();
  }
  if (url.protocol !== 'https:') {
    throw new EgressUrlNotAllowedError();
  }
  // URL keeps IPv6 literals bracketed ([::1]); strip them before net.isIP.
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) {
    throw new EgressUrlNotAllowedError();
  }
  if (net.isIP(host) !== 0 && isBlockedAddress(host)) {
    throw new EgressUrlNotAllowedError();
  }
};

/**
 * DNS lookup for the *hostname* path: resolve once, vet the resolved IP, then
 * hand that exact IP back to the socket. Because the connection uses the
 * address returned here — with no second resolution — a DNS-rebinding race
 * (public at check time, internal at connect time) has no window to land in.
 *
 * Never invoked for IP-literal hosts; Node skips `lookup` entirely for those —
 * that case is handled by {@link createGuardedHttpsAgent}.
 */
const guardedLookupImpl = (
  hostname: string,
  options: dns.LookupOptions,
  callback: (
    err: NodeJS.ErrnoException | null,
    address: string | dns.LookupAddress[],
    family?: number,
  ) => void,
): void => {
  dns.lookup(hostname, options, (err, address, family) => {
    if (err) {
      callback(err, address, family);
      return;
    }
    // options.all === true yields an array; vet every candidate address.
    const entries = Array.isArray(address) ? address : [{ address, family }];
    const blocked = entries.find((entry) => isBlockedAddress(entry.address));
    if (blocked) {
      callback(
        new Error(`Egress refused: ${hostname} resolved to non-public address ${blocked.address}`),
        address,
        family,
      );
      return;
    }
    callback(null, address, family);
  });
};

export const guardedLookup = guardedLookupImpl as unknown as LookupFunction;

/**
 * https.Agent whose createConnection refuses IP-literal hosts that resolve to a
 * non-public address — the gap `lookup` cannot cover, since Node never calls
 * `lookup` for a literal IP. Every connection (the initial URL, and each
 * endpoint a discovery document declares) passes through here, so an
 * internal-IP target reached via a public-looking entry point is caught too.
 *
 * Extends https.Agent because the guarded consumers (cloud OIDC, webhooks) are
 * HTTPS; the hostname path inside super.createConnection (tls.connect) still
 * honors the request's `lookup` (our guardedLookup).
 */
class GuardedHttpsAgent extends https.Agent {
  createConnection(
    options: { host?: string } & Record<string, unknown>,
    callback?: (err: Error | null, socket?: net.Socket) => void,
  ): net.Socket | undefined {
    const host = options.host;
    if (typeof host === 'string' && net.isIP(host) !== 0 && isBlockedAddress(host)) {
      const error = new Error(`Egress refused: ${host} is a non-public address`);
      if (callback) {
        callback(error);
        return undefined;
      }
      throw error;
    }
    const superCreateConnection = (
      https.Agent.prototype as unknown as {
        createConnection: (
          opts: unknown,
          cb?: (err: Error | null, socket?: net.Socket) => void,
        ) => net.Socket;
      }
    ).createConnection;
    return superCreateConnection.call(this, options, callback);
  }
}

export const createGuardedHttpsAgent = (): https.Agent => new GuardedHttpsAgent();
