import { RepresentationTarget } from './representation.schema';

/**
 * Compile a representation target back into internal element-targeting data — the
 * inverse of `decompileTarget`. A selector target → manual customSelector; a text
 * target → content match. Returns `{}` when absent (e.g. an element condition
 * with no target).
 */
export function compileTargetToElementData(target: RepresentationTarget | undefined): any {
  if (!target) {
    return {};
  }
  if (target.by === 'selector') {
    return {
      type: 'manual',
      customSelector: target.selector,
      ...(target.nth !== undefined ? { sequence: `${target.nth + 1}st` } : {}),
    };
  }
  return { type: 'auto', content: target.text, isDynamicContent: true };
}
