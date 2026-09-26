import {
  debugFlagNamesNamespace,
  debugQueryParamEnabled,
  isUndefined,
  withDebugNamespace,
  withoutDebugNamespace,
} from '@usertour/helpers';
import { window } from './globals';

/**
 * Console logger for the SDK (ADR 0019). The SDK runs inside customers'
 * production pages, so its console stays SILENT by default; the gate opens
 * through `usertour.setDebug(true)`, `?usertour_debug=1` in the page URL, or
 * the npm-`debug`-style flag in `localStorage.debug` (`*`, or a
 * `usertour-widget…` namespace). `critical` is the single sanctioned
 * exception — two call sites, both "this page's Usertour is not going to
 * work and here is why"; the ADR closes the list.
 *
 * Levels: `debug` is internal state flow (as many lines as it takes), `info`
 * is milestones (a dozen per session), `warn` is degraded-but-continuing,
 * `error` is one operation that failed. `debug` and `info` both go to
 * `console.log` — Chrome hides `console.debug` by default, and nobody should
 * have to opt in twice. Every component logs through `logger.scope(name)`,
 * which prefixes its lines `[usertour-widget:name]`.
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
const LOGGER_PREFIX = `[${NAMESPACE}]`;

const readStoredFlag = (): string => {
  try {
    return window?.localStorage?.getItem(DEBUG_KEY) ?? '';
  } catch {
    return '';
  }
};

const readFlag = (): boolean => {
  if (debugFlagNamesNamespace(readStoredFlag(), NAMESPACE)) {
    return true;
  }
  try {
    return debugQueryParamEnabled(window?.location?.search ?? '');
  } catch {
    return false;
  }
};

/** Merge-edit the persisted flag without clobbering other tools' namespaces. */
const writeFlag = (mutate: (storageValue: string) => string): void => {
  try {
    window?.localStorage?.setItem(DEBUG_KEY, mutate(readStoredFlag()));
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

type ConsoleLevel = 'log' | 'warn' | 'error';

const write = (level: ConsoleLevel, prefix: string, args: unknown[]): void => {
  if (!window || !debugEnabled || isUndefined(window.console) || !window.console) {
    return;
  }
  const consoleLog = window.console[level];
  const now = performance.now();
  const t = lastT ? Math.round(now - lastT) : 0;
  lastT = now;
  // eslint-disable-next-line no-console
  consoleLog(
    `%c${prefix} %c${args[0]} %c+${t}ms`,
    'color:#1FDB7D;',
    '',
    'color:#1FDB7D;',
    ...args.slice(1),
  );
};

export interface ScopedLogger {
  /** Internal state flow. Dozens of lines per minute is fine. */
  debug: (...args: unknown[]) => void;
  /** Milestones — identified, content started, reconnected. A dozen per session. */
  info: (...args: unknown[]) => void;
  /** Degraded but continuing — a dropped attribute, a missing target, an unsupported call. */
  warn: (...args: unknown[]) => void;
  /** One operation failed. Still behind the gate. */
  error: (...args: unknown[]) => void;
  /**
   * Always visible, gate or not. Two call sites by decision (ADR 0019 §2):
   * the UI failed to initialise for good, and the connection was rejected as
   * not retryable. Both mean "nothing will show and the host has no other
   * way to learn why". Do not add a third without amending the ADR.
   */
  critical: (...args: unknown[]) => void;
}

const createScopedLogger = (prefix: string): ScopedLogger => ({
  debug: (...args) => write('log', prefix, args),
  info: (...args) => write('log', prefix, args),
  warn: (...args) => write('warn', prefix, args),
  error: (...args) => write('error', prefix, args),
  critical: (...args) => {
    // eslint-disable-next-line no-console
    console.error(prefix, ...args);
  },
});

export const logger = {
  ...createScopedLogger(LOGGER_PREFIX),

  /** A logger whose lines carry the component name: `[usertour-widget:socket]`. */
  scope: (name: string): ScopedLogger => createScopedLogger(`[${NAMESPACE}:${name}]`),

  /** Whether the gate is currently open. */
  isEnabled: (): boolean => debugEnabled,

  /** Turn logging on, immediately, and persist OUR namespace for future loads —
   * never `*`, which would also switch on every other debug-convention library
   * on the page. */
  enabled: () => {
    debugEnabled = true;
    writeFlag((storageValue) => withDebugNamespace(storageValue, NAMESPACE));
  },

  /** Turn logging off, immediately, removing only our namespace. A `*` some
   * other tool persisted stays untouched — it may re-enable us after a reload,
   * but the in-memory gate wins until then. */
  disable: () => {
    debugEnabled = false;
    writeFlag((storageValue) => withoutDebugNamespace(storageValue, NAMESPACE));
  },
};
