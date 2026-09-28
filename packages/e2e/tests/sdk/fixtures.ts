import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { type Page, test as base, expect } from '@playwright/test';
import { ProtocolServer } from './protocol-server';

/**
 * The SDK runtime suite: the BUILT SDK bundle on a plain host page, talking to
 * a protocol server the test controls (see protocol-server.ts). Time in the
 * page is Playwright's fake clock, so the SDK's 30-second acknowledgement
 * timeout, its connection timeout and every backoff are advanced by the test
 * instead of waited for.
 */

// Must match RUNTIME_HOST_PORT in scripts/static-host.mjs and the config.
export const RUNTIME_HOST_URL = 'http://127.0.0.1:5191';

const SDK_VERSION: string = JSON.parse(
  readFileSync(resolve(__dirname, '../../../../apps/sdk/package.json'), 'utf8'),
).version;
export const SDK_BUNDLE_URL = `${RUNTIME_HOST_URL}/sdk-dist/${SDK_VERSION}/es2020/usertour.js`;

/** What the SDK sends an unacknowledged message into (usertour-socket.ts EMIT_TIMEOUT). */
export const EMIT_TIMEOUT_MS = 30_000;

export type Outcome<T = unknown> = { ok: true; value: T } | { ok: false; error: string };
export type WriteResult = { rejected: Array<{ codeName: string; reason: string }> };
export type LogLine = { level: 'log' | 'warn' | 'error'; text: string };

declare global {
  interface Window {
    USERTOURJS_ENV_VARS?: Record<string, string>;
    usertour?: Record<string, (...args: unknown[]) => unknown> & { _stubbed?: boolean };
    __usertourLogs: LogLine[];
    __usertourCalls: Record<string, Outcome | undefined>;
  }
}

/** Drives the SDK's public API on the host page and reads back what it did. */
export class SdkPage {
  private nextCall = 0;

  constructor(
    readonly page: Page,
    readonly protocol: ProtocolServer,
  ) {}

  /**
   * Load the host page with the SDK bundle pointed at the protocol server. The
   * env vars must be on `window` before the bundle evaluates — that is when
   * the SDK reads its server URL, once.
   */
  async open(): Promise<void> {
    await this.page.addInitScript(
      ({ wsUri, assetsUri }) => {
        window.USERTOURJS_ENV_VARS = { WS_URI: wsUri, ASSETS_URI: assetsUri };
        window.__usertourCalls = {};
        const logs: LogLine[] = [];
        window.__usertourLogs = logs;
        for (const level of ['log', 'warn', 'error'] as const) {
          const original = console[level].bind(console);
          console[level] = (...args: unknown[]) => {
            // The SDK logger writes `%c[prefix] %cmessage %c+ms` plus CSS args;
            // keep the words, drop the styling.
            const text = args
              .filter((arg) => typeof arg !== 'string' || !arg.startsWith('color:'))
              .map((arg) => (typeof arg === 'string' ? arg.replace(/%c/g, '') : String(arg)))
              .join(' ');
            logs.push({ level, text });
            original(...args);
          };
        }
      },
      { wsUri: this.protocol.url, assetsUri: `${RUNTIME_HOST_URL}/sdk-dist` },
    );
    await this.page.clock.install();
    await this.page.goto(`${RUNTIME_HOST_URL}/runtime.html`);
    await this.page.addScriptTag({ type: 'module', url: SDK_BUNDLE_URL });
    await expect
      .poll(() => this.page.evaluate(() => Boolean(window.usertour && !window.usertour._stubbed)))
      .toBe(true);
    await this.page.evaluate(() => window.usertour?.setDebug?.(true));
  }

  /** Advance the page's clock: timers due within `ms` fire, in order. */
  advance(ms: number): Promise<void> {
    return this.page.clock.runFor(ms);
  }

  /**
   * Call a public method and await its outcome. Only for calls that resolve on
   * their own (the server answers); a call that must time out is started with
   * `begin` and settled after `advance`.
   */
  call<T = unknown>(method: string, ...args: unknown[]): Promise<Outcome<T>> {
    return this.page.evaluate(
      async ({ method, args }) => {
        try {
          const api = window.usertour as Record<string, (...args: unknown[]) => unknown>;
          const value = await api[method](...args);
          return { ok: true as const, value: value as unknown };
        } catch (error) {
          return { ok: false as const, error: String((error as Error)?.message ?? error) };
        }
      },
      { method, args },
    ) as Promise<Outcome<T>>;
  }

  /** Start a call without waiting for it; `settle` reads its outcome later. */
  async begin(method: string, ...args: unknown[]): Promise<string> {
    const id = `call-${this.nextCall++}`;
    await this.page.evaluate(
      ({ id, method, args }) => {
        const api = window.usertour as Record<string, (...args: unknown[]) => unknown>;
        Promise.resolve()
          .then(() => api[method](...args))
          .then(
            (value) => {
              window.__usertourCalls[id] = { ok: true, value };
            },
            (error) => {
              window.__usertourCalls[id] = {
                ok: false,
                error: String((error as Error)?.message ?? error),
              };
            },
          );
      },
      { id, method, args },
    );
    return id;
  }

  async settle<T = unknown>(id: string): Promise<Outcome<T>> {
    await expect
      .poll(() => this.page.evaluate((id) => window.__usertourCalls[id] !== undefined, id))
      .toBe(true);
    return this.page.evaluate((id) => window.__usertourCalls[id], id) as Promise<Outcome<T>>;
  }

  init(token = 'env-token'): Promise<Outcome> {
    return this.call('init', token);
  }

  identify(userId: string, attributes?: Record<string, unknown>, options?: { token?: string }) {
    return this.call<WriteResult>('identify', userId, attributes, options);
  }

  updateUser(attributes: Record<string, unknown>, options?: { token?: string }) {
    return this.call<WriteResult>('updateUser', attributes, options);
  }

  group(
    companyId: string,
    attributes?: Record<string, unknown>,
    options?: { token?: string; membership?: Record<string, unknown> },
  ) {
    return this.call<WriteResult>('group', companyId, attributes, options);
  }

  updateGroup(
    attributes?: Record<string, unknown>,
    options?: { token?: string; membership?: Record<string, unknown> },
  ) {
    return this.call<WriteResult>('updateGroup', attributes, options);
  }

  reset(): Promise<Outcome> {
    return this.call('reset');
  }

  logs(): Promise<LogLine[]> {
    return this.page.evaluate(() => window.__usertourLogs);
  }

  async logLines(pattern: RegExp): Promise<LogLine[]> {
    return (await this.logs()).filter((line) => pattern.test(line.text));
  }
}

type Fixtures = { sdk: SdkPage };
type WorkerFixtures = { protocol: ProtocolServer };

export const test = base.extend<Fixtures, WorkerFixtures>({
  protocol: [
    // biome-ignore lint/correctness/noEmptyPattern: Playwright requires the destructuring form
    async ({}, use) => {
      const server = await ProtocolServer.start();
      await use(server);
      await server.stop();
    },
    { scope: 'worker' },
  ],
  sdk: async ({ page, protocol }, use) => {
    protocol.reset();
    const sdk = new SdkPage(page, protocol);
    await sdk.open();
    await use(sdk);
  },
});

export { expect };
