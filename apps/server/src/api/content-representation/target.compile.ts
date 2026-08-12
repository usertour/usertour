import { RepresentationTarget } from './representation.schema';

/**
 * Compile a representation target back into internal element-targeting data — the
 * inverse of `decompileTarget`. The representation fully owns the locator
 * (`selector` → customSelector, optional `text` → content, `nth` → sequence), so
 * those fields are rewritten from it; only fields the representation can't express
 * are field-merged from `existing` — notably `actions` (click-the-target-to-advance,
 * read by the SDK in tour.tsx) and the (currently unused) auto fingerprint.
 * Returns the merge base when absent (e.g. an element condition with no target).
 *
 * The legacy `selectors` fingerprint tree / `precision` are deliberately NOT
 * reconstructed — the runtime resolves `manual` targets by `customSelector` and
 * never reads them (see decompileTarget's note).
 */
export function compileTargetToElementData(
  target: RepresentationTarget | undefined,
  existing?: unknown,
): any {
  const base = existing && typeof existing === 'object' ? (existing as Record<string, any>) : {};
  if (!target) {
    // No representation target → keep whatever was there (field-merge base).
    return base;
  }
  // Strip the old locator fields (the representation rewrites them) and keep the
  // rest. `content` and `sequence` belong to the OLD element, so re-deriving them
  // from the representation avoids stale text rejecting a re-targeted element.
  const { content: _staleContent, sequence: _staleSequence, ...rest } = base;
  return {
    ...rest,
    type: 'manual',
    customSelector: target.selector,
    ...(target.text ? { content: target.text } : {}),
    ...(target.nth !== undefined ? { sequence: `${target.nth + 1}st` } : {}),
  };
}
