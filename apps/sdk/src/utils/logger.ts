import { isUndefined } from '@usertour/helpers';
import { window } from './globals';

/**
 * Console logger for the SDK, gated by the npm-`debug`-style flag in
 * `localStorage.debug` (`*`, or a `usertour-widget…` namespace). ALL levels sit
 * behind the gate — the SDK runs inside customers' production pages and its
 * console stays SILENT by default; the flag is the only opening. (`critical` is
 * the single sanctioned exception, for failures that must never be swallowed —
 * use it sparingly or the default-silent stance is meaningless.)
 *
 * Two hard rules, both from real incidents:
 * - Storage access must NEVER throw. In a sandboxed iframe (no
 *   allow-same-origin) or under strict privacy policies, touching localStorage
 *   throws a SecurityError — and this module is imported at the top of nearly
 *   every SDK file, so an unguarded read here executes at module scope and
 *   kills the ENTIRE SDK at load (build green, runtime dead — the chunk-cycle
 *   death class). Every storage touch is wrapped; "can't read the flag"
 *   degrades to "disabled".
 * - `enabled()` / `disable()` must apply IMMEDIATELY. The previous
 *   implementation computed the flag once at module load, so the runtime
 *   switch silently did nothing until a reload — a placebo exactly when
 *   someone is mid-debugging. The gate is a cache these two functions update
 *   in place. (Editing localStorage by hand still needs a reload, same as the
 *   npm `debug` convention everywhere else.)
 */

const DEBUG_KEY = 'debug';
const NAMESPACE = 'usertour-widget';
const LOGGER_PREFIX = '[usertour-widget]';

const readFlag = (): boolean => {
  try {
    const raw = window?.localStorage?.getItem(DEBUG_KEY) ?? '';
    return raw.split(',').some((entry) => {
      const token = entry.trim();
      return token === '*' || token.startsWith(NAMESPACE);
    });
  } catch {
    return false;
  }
};

/** Merge-edit the persisted flag without clobbering other tools' namespaces. */
const writeFlag = (mutate: (tokens: string[]) => string[]): void => {
  try {
    const raw = window?.localStorage?.getItem(DEBUG_KEY) ?? '';
    const tokens = raw
      .split(',')
      .map((token) => token.trim())
      .filter(Boolean);
    window?.localStorage?.setItem(DEBUG_KEY, mutate(tokens).join(','));
  } catch {
    // Storage unavailable — the in-memory gate still flipped, so logging works
    // for this page's lifetime; the choice just won't survive a reload.
  }
};

/** The gate. Read once at load; runtime changes go through enabled()/disable(). */
let debugEnabled = readFlag();

/** Shared timeline for the `+Xms` delta: time since the PREVIOUS log line from
 * ANY component — useful for tracing one flow, misleading when two interleave. */
let lastT: number | undefined;

export const logger = {
  /** Turn logging on, immediately, and persist OUR namespace for future loads —
   * never `*`, which would also switch on every other debug-convention library
   * on the page. */
  enabled: () => {
    debugEnabled = true;
    writeFlag((tokens) =>
      tokens.includes(`${NAMESPACE}:*`) ? tokens : [...tokens, `${NAMESPACE}:*`],
    );
  },

  /** Turn logging off, immediately, removing only our namespace. A `*` some
   * other tool persisted stays untouched — it may re-enable us after a reload,
   * but the in-memory gate wins until then. */
  disable: () => {
    debugEnabled = false;
    writeFlag((tokens) => tokens.filter((token) => !token.startsWith(NAMESPACE)));
  },

  _log: (level: 'log' | 'warn' | 'error', ...args: unknown[]) => {
    if (!window || !debugEnabled || isUndefined(window.console) || !window.console) {
      return;
    }
    const consoleLog = window.console[level];
    const now = performance.now();
    const t = lastT ? Math.round(now - lastT) : 0;
    lastT = now;
    // eslint-disable-next-line no-console
    consoleLog(
      `%c${LOGGER_PREFIX} %c${args[0]} %c+${t}ms`,
      'color:#1FDB7D;',
      '',
      'color:#1FDB7D;',
      ...args.slice(1),
    );
  },

  info: (...args: unknown[]) => {
    logger._log('log', ...args);
  },

  warn: (...args: unknown[]) => {
    logger._log('warn', ...args);
  },

  error: (...args: unknown[]) => {
    logger._log('error', ...args);
  },

  /** Always visible, gate or not — reserved for failures that must never be
   * swallowed. The bar: "the SDK is broken", not "something looked off". */
  critical: (...args: unknown[]) => {
    // eslint-disable-next-line no-console
    console.error(LOGGER_PREFIX, ...args);
  },

  uninitializedWarning: (methodName: string) => {
    logger.error(`You must initialize Usertour before calling ${methodName}`);
  },
};
