import { RepresentationTarget } from './representation.schema';

/**
 * Compile a representation target back into internal element-targeting data — the
 * inverse of `decompileTarget`. A selector target → manual customSelector; a text
 * target → content match. Returns `{}` when absent (e.g. an element condition
 * with no target).
 *
 * The legacy `selectors` fingerprint tree / `precision` are deliberately NOT
 * reconstructed — the current runtime resolves `manual` targets by
 * `customSelector` and never reads them (see decompileTarget's note).
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
  if (target.by === 'selector') {
    // Field-merge: the representation models only the locator, but the stored
    // elementData also carries fields the representation can't express and the
    // runtime/builder still use — notably `actions` (click-the-target-to-advance,
    // read by the SDK in tour.tsx) — plus the (currently unused) auto fingerprint.
    // Preserve them across a write-back. `content` (used by the matcher for text
    // disambiguation) is the OLD element's text, so it's only safe to keep when
    // the selector is unchanged (a re-target would otherwise reject the new
    // element); drop it when the selector actually changes.
    const sameElement = base.customSelector === target.selector;
    const { content: _staleContent, ...withoutContent } = base;
    return {
      ...(sameElement ? base : withoutContent),
      type: 'manual',
      customSelector: target.selector,
      ...(target.nth !== undefined ? { sequence: `${target.nth + 1}st` } : {}),
    };
  }
  // Text target: `content` comes fresh from the representation, so no staleness.
  return { ...base, type: 'auto', content: target.text, isDynamicContent: true };
}
