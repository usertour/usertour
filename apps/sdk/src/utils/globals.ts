/*
 * Global helpers to protect access to browser globals in a way that is safer for different targets
 * like DOM, SSR, Web workers etc.
 *
 * NOTE: Typically we want the "window" but globalThis works for both the typical browser context as
 * well as other contexts such as the web worker context. Window is still exported for any bits that explicitly require it.
 * If in doubt - export the global you need from this file and use that as an optional value. This way the code path is forced
 * to handle the case where the global is not available.
 */

// eslint-disable-next-line no-restricted-globals
const win: (Window & typeof globalThis) | undefined = typeof window !== 'undefined' ? window : undefined

const global: typeof globalThis | undefined = typeof globalThis !== 'undefined' ? globalThis : win

export const ArrayProto = Array.prototype
export const nativeForEach = ArrayProto.forEach
export const nativeIndexOf = ArrayProto.indexOf

export const navigator = global?.navigator
export const document = global?.document
export const location = global?.location
export const fetch = global?.fetch
export const XMLHttpRequest =
    global?.XMLHttpRequest && 'withCredentials' in new global.XMLHttpRequest() ? global.XMLHttpRequest : undefined
export const AbortController = global?.AbortController
export const userAgent = navigator?.userAgent
export const assignableWindow: Window & typeof globalThis & Record<string, any> = win ?? ({} as any)

export { win as window }
