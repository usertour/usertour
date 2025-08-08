import { navigator, window } from './globals';

export const noop = () => {};

export function on<T extends Window | Document | HTMLElement | EventTarget>(
  obj: T | null,
  ...args: Parameters<T['addEventListener']> | [string, (...args: any[]) => void, ...any]
): void {
  if (obj?.addEventListener) {
    obj.addEventListener(...(args as Parameters<HTMLElement['addEventListener']>));
  }
}

export function off<T extends Window | Document | HTMLElement | EventTarget>(
  obj: T | null,
  ...args: Parameters<T['removeEventListener']> | [string, (...args: any[]) => void, ...any]
): void {
  if (obj?.removeEventListener) {
    obj.removeEventListener(...(args as Parameters<HTMLElement['removeEventListener']>));
  }
}

export const isBrowser = typeof window !== 'undefined';

export const isNavigator = typeof navigator !== 'undefined';
