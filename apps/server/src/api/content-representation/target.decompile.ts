import { RepresentationTarget } from './representation.schema';

/**
 * Decompile internal element-targeting data (ElementSelectorPropsData / finder
 * data) into a representation target: `customSelector` → `selector`, the optional
 * `content` text check → `text`, and `sequence` → `nth`. Only a `manual` target
 * (which carries a usable CSS selector) is modeled; the internal "auto" selectors
 * fingerprint has no authorable selector and decompiles to undefined (flagged
 * unsupported by hasAutoTarget).
 *
 * NOTE: the captured `selectors` fingerprint tree (and its `precision`
 * threshold / `isDynamicContent` flag) is NOT used by the current runtime —
 * finderV2 (packages/finder) resolves a `manual` target by `customSelector`
 * (+ optional `content` / `sequence`) and only reads `selectors`/`precision` on
 * the legacy `auto` branch. So dropping the fingerprint here is lossless for live
 * targeting; it is intentionally neither modeled nor preserved on write-back.
 */
export function decompileTarget(raw: unknown): RepresentationTarget | undefined {
  const t = raw as any;
  if (!t || typeof t !== 'object') {
    return undefined;
  }
  if (t.type && t.type !== 'auto' && typeof t.customSelector === 'string' && t.customSelector) {
    const nth = parseNth(t.sequence);
    const text = typeof t.content === 'string' && t.content ? t.content : undefined;
    return {
      selector: t.customSelector,
      ...(text !== undefined ? { text } : {}),
      ...(nth !== undefined ? { nth } : {}),
    };
  }
  return undefined;
}

/** True when the target carries an "auto" selectors fingerprint (opaque). */
export function hasAutoTarget(raw: unknown): boolean {
  const t = raw as any;
  return !!(t && typeof t === 'object' && (t.selectors || t.selectorsList || t.type === 'auto'));
}

function parseNth(sequence: unknown): number | undefined {
  if (typeof sequence !== 'string') {
    return undefined;
  }
  const n = Number.parseInt(sequence, 10);
  return Number.isFinite(n) && n >= 1 ? n - 1 : undefined;
}
