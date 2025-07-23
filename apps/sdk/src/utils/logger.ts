import { isUndefined } from '@usertour-packages/utils';
import { window } from './globals';

const debugEnabled = (localStorage.getItem('debug') || '')
  .split(',')
  .some((v) => v === '*' || v.startsWith('usertour-widget:*'));

let lastT: any;

const LOGGER_PREFIX = '[usertour-widget]';
export const logger = {
  enabled: () => {
    localStorage.setItem('debug', '*');
  },
  _log: (level: 'log' | 'warn' | 'error', ...args: any[]) => {
    if (window && debugEnabled && !isUndefined(window.console) && window.console) {
      const consoleLog = window.console[level];
      // eslint-disable-next-line no-console
      consoleLog(LOGGER_PREFIX, ...args);
      const now = performance.now();
      const t = lastT ? Math.round(now - lastT) : 0;
      lastT = now;
      consoleLog(
        `%c${LOGGER_PREFIX} %c${args[0]} %c+${t}ms`,
        'color:#1FDB7D;',
        '',
        'color:#1FDB7D;',
        ...args,
      );
    }
  },

  info: (...args: any[]) => {
    logger._log('log', ...args);
  },

  warn: (...args: any[]) => {
    logger._log('warn', ...args);
  },

  error: (...args: any[]) => {
    logger._log('error', ...args);
  },

  critical: (...args: any[]) => {
    // Critical errors are always logged to the console
    // eslint-disable-next-line no-console
    console.error(LOGGER_PREFIX, ...args);
  },

  uninitializedWarning: (methodName: string) => {
    logger.error(`You must initialize Usertour before calling ${methodName}`);
  },
};
