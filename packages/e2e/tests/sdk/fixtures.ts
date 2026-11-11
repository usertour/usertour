import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { type FrameLocator, type Locator, type Page, test as base, expect } from '@playwright/test';
import { USERTOUR_LOADER_SNIPPET } from '../../../../apps/web/src/pages/settings/installation/snippet';
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

export const SDK_VERSION: string = JSON.parse(
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
    __usertourOpened: Array<{ url: string; target: string | undefined }>;
    /** What a test's own callbacks in the page recorded, by name. */
    __usertourRecorded: Record<string, string[]>;
    USERTOURJS_QUEUE?: unknown[];
  }
}

/**
 * How the SDK gets onto the host page: `bundle` adds the built bundle
 * directly; `snippet` runs the loader snippet the install page hands out,
 * which loads the bundle on the first call and queues calls until then.
 */
export type Loader = 'bundle' | 'snippet';

export type OpenOptions = {
  assetsUri?: string;
  loader?: Loader;
  /** Query string for the host page, e.g. `usertour=flow-9`. */
  query?: string;
};

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
  async open(options: OpenOptions = {}): Promise<void> {
    const loader = options.loader ?? 'bundle';
    await this.page.addInitScript(
      ({ wsUri, assetsUri, bundleUrl }) => {
        window.USERTOURJS_ENV_VARS = {
          WS_URI: wsUri,
          ASSETS_URI: assetsUri,
          ...(bundleUrl ? { USERTOURJS_ES2020_URL: bundleUrl } : {}),
        };
        window.__usertourCalls = {};
        window.__usertourRecorded = {};
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
      {
        wsUri: this.protocol.url,
        assetsUri: options.assetsUri ?? `${RUNTIME_HOST_URL}/sdk-dist`,
        bundleUrl: loader === 'snippet' ? SDK_BUNDLE_URL : undefined,
      },
    );
    await this.page.clock.install();
    // Debug logging from the first line: the query flag is read when the
    // bundle evaluates, before any call could turn it on.
    const query = ['usertour_debug=1', options.query].filter(Boolean).join('&');
    await this.page.goto(`${RUNTIME_HOST_URL}/runtime.html?${query}`);
    if (loader === 'snippet') {
      // Only the stub: the bundle loads on the first call, as on a customer page.
      await this.page.addScriptTag({ content: USERTOUR_LOADER_SNIPPET });
      return;
    }
    await this.page.addScriptTag({ type: 'module', url: SDK_BUNDLE_URL });
    await this.waitForBundle();
    await this.page.evaluate(() => window.usertour?.setDebug?.(true));
  }

  /** Wait until the bundle has replaced the loader's stub. */
  async waitForBundle(): Promise<void> {
    await expect
      .poll(() => this.page.evaluate(() => Boolean(window.usertour && !window.usertour._stubbed)))
      .toBe(true);
  }

  /**
   * Reload the host page as a user refreshing it: the SDK loads again with
   * nothing but what the page kept in its storage.
   */
  async reload(): Promise<void> {
    await this.page.reload();
    await this.page.addScriptTag({ type: 'module', url: SDK_BUNDLE_URL });
    await this.waitForBundle();
    await this.page.evaluate(() => window.usertour?.setDebug?.(true));
  }

  /**
   * Stop the page's clock: from here on no timer fires until `advance`, so a
   * test can say what has, and has not, happened by an exact time.
   */
  async pauseClock(): Promise<void> {
    // The page's time keeps flowing between reading it and pausing, so pause
    // a little ahead of it; a busy machine may need a wider margin.
    for (const margin of [50, 250, 1_000]) {
      const now = await this.page.evaluate(() => Date.now());
      try {
        await this.page.clock.pauseAt(now + margin);
        return;
      } catch (error) {
        if (!String(error).includes('to the past')) {
          throw error;
        }
      }
    }
    throw new Error('could not pause the page clock');
  }

  /**
   * Record navigations instead of making them: the SDK opens pages through
   * `window.top.open`, which would unload the page under test. Returns a
   * reader of what was opened, oldest first.
   */
  async stubNavigation(): Promise<() => Promise<Array<{ url: string; target?: string }>>> {
    await this.page.evaluate(() => {
      window.__usertourOpened = [];
      window.open = ((url?: string | URL, target?: string) => {
        window.__usertourOpened.push({ url: String(url), target });
        return null;
      }) as typeof window.open;
    });
    return () => this.page.evaluate(() => window.__usertourOpened);
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

  isStarted(contentId: string): Promise<boolean> {
    return this.page.evaluate(
      (contentId) => Boolean(window.usertour?.isStarted?.(contentId)),
      contentId,
    );
  }

  // --- the rendered widgets (see tests/sdk/content.ts for what is pushed) ---

  /** The SDK's mount point; attached once the UI initialised. */
  get widget(): Locator {
    return this.page.locator('#usertour-widget');
  }

  /** The floating surface of a flow step, a launcher tooltip or an expanded checklist. */
  get surface(): Locator {
    return this.page.locator('[data-usertour-popper-content-wrapper]');
  }

  /** The content frame inside a surface: a step's blocks, the checklist's items. */
  frame(): FrameLocator {
    return this.page.frameLocator('iframe.usertour-widget-surface-viewport');
  }

  /** What the page's own callbacks recorded under `name` (see `__usertourRecorded`). */
  recorded(name: string): Promise<string[]> {
    return this.page.evaluate((name) => window.__usertourRecorded[name] ?? [], name);
  }

  logs(): Promise<LogLine[]> {
    return this.page.evaluate(() => window.__usertourLogs);
  }

  async logLines(pattern: RegExp): Promise<LogLine[]> {
    return (await this.logs()).filter((line) => pattern.test(line.text));
  }
}

type Fixtures = {
  sdk: SdkPage;
  /** Where the page loads the SDK's CSS from; a test overrides it to break the UI. */
  assetsUri: string;
  /** How the SDK is installed on the host page (see `Loader`). */
  loader: Loader;
  /** Query string the host page is opened with. */
  hostQuery: string;
};
type WorkerFixtures = { protocol: ProtocolServer };

export const test = base.extend<Fixtures, WorkerFixtures>({
  assetsUri: [`${RUNTIME_HOST_URL}/sdk-dist`, { option: true }],
  loader: ['bundle', { option: true }],
  hostQuery: ['', { option: true }],
  protocol: [
    // biome-ignore lint/correctness/noEmptyPattern: Playwright requires the destructuring form
    async ({}, use) => {
      const server = await ProtocolServer.start();
      await use(server);
      await server.stop();
    },
    { scope: 'worker' },
  ],
  sdk: async ({ page, protocol, assetsUri, loader, hostQuery }, use) => {
    protocol.reset();
    const sdk = new SdkPage(page, protocol);
    await sdk.open({ assetsUri, loader, query: hostQuery });
    await use(sdk);
  },
});

export { expect };
