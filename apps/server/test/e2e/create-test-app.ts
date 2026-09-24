import { WorkerHost } from '@nestjs/bullmq';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModuleBuilder } from '@nestjs/testing';
import type { Job } from 'bullmq';
import { PrismaService } from 'nestjs-prisma';

import { AppModule } from '@/app.module';
import { configureApp } from '@/configure-app';

import { ResponseContractInterceptor } from './response-contract';

/**
 * Boots the full application for an HTTP e2e spec. Connects to whatever
 * DATABASE_URL points at — run e2e with it pointed at a migrated test
 * database. Call once in `beforeAll`; `app.close()` in `afterAll`
 * (jest may need `--forceExit` because redis/bullmq/websocket keep handles).
 *
 * Pass `override` to swap providers before the module compiles — used by specs
 * that must mock external clients (e.g. Stripe, jsforce):
 *
 *   const app = await createTestApp((b) =>
 *     b.overrideProvider(StripeToken).useValue(mockStripe));
 */
export async function createTestApp(
  override?: (builder: TestingModuleBuilder) => TestingModuleBuilder,
): Promise<INestApplication> {
  const base = Test.createTestingModule({ imports: [AppModule] });
  const moduleRef = await (override ? override(base) : base).compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);

  // In-flight job count per BullMQ processor, taken at the processor itself:
  // `process` is wrapped BEFORE `init()`, because that is when @nestjs/bullmq
  // binds it into a Worker that starts consuming at once — a leftover job on
  // the shared queue can be running before any test does. Counting at the
  // function covers every exit path; worker events do not (a processor that
  // defers itself with moveToDelayed + DelayedError emits neither `completed`
  // nor `failed`, and the webhook and integration processors do exactly that).
  const hosts = [
    ...(moduleRef as unknown as { container: NestContainer }).container.getModules().values(),
  ]
    .flatMap((module) => [...module.providers.values()])
    .map((wrapper) => wrapper.instance)
    .filter((instance): instance is WorkerHost => instance instanceof WorkerHost);
  const inFlight = new Map<WorkerHost, number>();
  for (const host of hosts) {
    inFlight.set(host, 0);
    const original = host.process.bind(host);
    host.process = async (job: Job, token?: string) => {
      inFlight.set(host, (inFlight.get(host) ?? 0) + 1);
      try {
        return await original(job, token);
      } finally {
        inFlight.set(host, (inFlight.get(host) ?? 0) - 1);
      }
    };
  }
  // Every /v2 response is parsed through the zod schema its OpenAPI entry is
  // generated from — see ./response-contract. Test-only: production must not
  // pay a parse per response, and a contract slip there should not 500.
  // The tally is asserted by a global afterAll (test/setup-contract-e2e.ts),
  // NOT here — the wrapped close() below is itself raced against a cap, so
  // nothing that must run may hang off it.
  app.useGlobalInterceptors(new ResponseContractInterceptor());
  await app.init();
  // Listen once per suite. supertest otherwise `listen(0)`s and `close()`s the
  // server around EVERY request, and on Node 22 (keep-alive agents by default,
  // `server.close()` dropping idle sockets) that churn is where the full run's
  // `read ECONNRESET` / `socket hang up` came from. The websocket specs need a
  // live port anyway.
  await app.listen(0);
  const workers = hosts.map((host) => host.worker);

  // nestjs-prisma's PrismaService implements OnModuleInit only — `app.close()`
  // never `$disconnect()`s the Postgres pool. Harmless in production (process
  // exit closes the sockets), fatal here: jest REUSES worker processes across
  // suites, so every suite's pool (connection_limit=3, set in setup-e2e.ts)
  // leaked and accumulated — 59 suites × 3 > Postgres max_connections (100),
  // and the parallel full run drowned in "too many clients" 500s while
  // individual suites stayed green. Close the pool with the app.
  //
  // The Nest close itself is CAPPED at 10s: it normally completes in ~15ms but
  // intermittently blocks far past the 60s hook timeout on lingering
  // redis/bullmq handles — capability-matrix failed 3 of 6 full runs on
  // exactly this (afterAll timeout, 60/60 tests green; probed teardown 65ms +
  // close 13ms on the good runs). The process is reaped by jest --forceExit,
  // so a hung shutdown costs nothing — but the Prisma disconnect below must
  // run EVEN WHEN the cap wins, or the pool leak above comes back.
  //
  // The BullMQ workers are shut down by the harness BEFORE Nest's close, in
  // three steps: stop taking jobs (`pause(true)` only flips the flag — it
  // never waits), let the jobs already running finish (bounded), then force
  // close. Nest's own graceful close is what hung: a worker parked in a
  // blocking BZPOPMIN intermittently never leaves its run loop once its
  // blocking connection is disconnected, the cap won, and the stranded
  // workers kept pulling jobs off the SHARED e2e queues for the rest of the
  // in-band run with a Prisma pool that had already been disconnected. A bare
  // `close(true)` would skip the wait but not cancel a running processor —
  // it would then hit the disconnected pool — hence the drain in between.
  const close = app.close.bind(app);
  app.close = async () => {
    await Promise.all(workers.map((worker) => worker.pause(true)));
    const drained = await waitUntil(
      () => [...inFlight.values()].every((count) => count === 0),
      10_000,
    );
    if (!drained) {
      console.error('[e2e] jobs still running 10s after the suite ended; force-closing workers');
    }
    await Promise.all(workers.map((worker) => worker.close(true)));
    let capped = true;
    await Promise.race([
      close().then(() => {
        capped = false;
      }),
      new Promise((resolve) => setTimeout(resolve, 10_000).unref()),
    ]);
    if (capped) {
      // Visible in the run log: a capped close means handles leaked into later suites.
      console.error('[e2e] app.close() exceeded the 10s cap');
    }
    await app.get(PrismaService).$disconnect();
  };
  return app;
}

interface NestContainer {
  getModules(): Map<string, { providers: Map<unknown, { instance: unknown }> }>;
}

const waitUntil = async (condition: () => boolean, timeoutMs: number): Promise<boolean> => {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() >= deadline) {
      return false;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return true;
};
