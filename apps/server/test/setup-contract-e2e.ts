import { assertNoContractViolations, dumpContractCoverage } from './e2e/response-contract';

/**
 * Registers the v2 response-contract assertion as a GLOBAL `afterAll`, so it
 * runs once per spec file no matter how that file tears down.
 *
 * It used to hang off `createTestApp`'s wrapped `app.close()`. That was
 * untrustworthy twice over: `close()` intermittently blocks on lingering
 * redis/bullmq/websocket handles (the process is reaped by `--forceExit`
 * anyway), so specs raced it against a timeout — and whenever the timeout won,
 * code hanging off close() silently never ran: violations dropped, coverage
 * unrecorded, run still green. createTestApp now caps the hangable shutdown
 * itself, which is exactly why nothing that MUST run may live there. A
 * jest-level hook cannot be raced away.
 */
afterAll(() => {
  dumpContractCoverage();
  assertNoContractViolations();
});
