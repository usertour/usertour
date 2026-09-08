import { CRM_ROUND_STALE_MS } from '@usertour/constants';
import { RETRY_AFTER_MAX_MS, RETRY_DELAYS_MS } from '@/outbound/delivery-backoff';

/**
 * A full-sync round's heartbeat is refreshed by every page and every retry,
 * so the stale sweep may only take a round over after a silence longer than
 * any single wait a page job can legitimately take (ADR 0013 §7).
 */
describe('CRM round stale window', () => {
  it('outlasts the longest single wait on the delivery ladder', () => {
    expect(CRM_ROUND_STALE_MS).toBeGreaterThan(Math.max(...RETRY_DELAYS_MS));
  });

  it('outlasts the Retry-After cap', () => {
    expect(CRM_ROUND_STALE_MS).toBeGreaterThan(RETRY_AFTER_MAX_MS);
  });
});
