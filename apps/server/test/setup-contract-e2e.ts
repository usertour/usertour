import { assertNoContractViolations, dumpContractCoverage } from './e2e/response-contract';

/**
 * Registers the v2 response-contract assertion as a GLOBAL `afterAll`, so it
 * runs once per spec file no matter how that file tears down.
 *
 * It used to hang off `createTestApp`'s wrapped `app.close()`. That silently
 * skipped any suite that does not await the close to completion — e.g.
 * event-definitions, which guards against a hanging shutdown with
 *
 *   await Promise.race([app?.close(), new Promise((r) => setTimeout(r, 5000))])
 *
 * because `close()` can block on lingering redis/bullmq/websocket handles (the
 * process is reaped by `--forceExit` anyway). When the timeout won that race the
 * code after `close()` never ran, so that suite's violations were dropped and
 * its coverage never recorded — while the run still went green. One spec doing
 * this is enough to make a close()-based hook untrustworthy; a jest-level hook
 * cannot be raced away.
 */
afterAll(() => {
  dumpContractCoverage();
  assertNoContractViolations();
});
