import { AuthoringTarget } from './authoring.schema';

/**
 * Decompile internal element-targeting data (ElementSelectorPropsData / finder
 * data) into an authoring target. Only `selector` (customSelector + sequence)
 * and `text` (content match) are modeled; the internal "auto" selectors
 * fingerprint is not authorable and decompiles to undefined.
 */
export function decompileTarget(raw: unknown): AuthoringTarget | undefined {
  const t = raw as any;
  if (!t || typeof t !== 'object') {
    return undefined;
  }
  if (t.type && t.type !== 'auto' && typeof t.customSelector === 'string' && t.customSelector) {
    const nth = parseNth(t.sequence);
    return { by: 'selector', selector: t.customSelector, ...(nth !== undefined ? { nth } : {}) };
  }
  if (typeof t.content === 'string' && t.content) {
    return { by: 'text', text: t.content };
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
