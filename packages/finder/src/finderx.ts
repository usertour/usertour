export type Target = {
  selectors?: any;
  content?: string;
  sequence?: string;
  precision?: string;
  isDynamicContent?: boolean;
  customSelector?: string;
  type?: string;
};

/** A subtree a selector is resolved in: a document, or an element such as a document's body. */
export type SearchRoot = Element | Document;

const sequenceMapping: Record<string, number> = {
  '1st': 0,
  '2st': 1,
  '3st': 2,
  '4st': 3,
  '5st': 4,
};

/**
 * Resolve a target's `customSelector` across `roots`, in order. `sequence`
 * picks the nth match counted across all roots (falling back to the first),
 * and a non-empty `content` must equal the match's trimmed text.
 */
export function finderV2(target: Target, roots: ReadonlyArray<SearchRoot>): HTMLElement | null {
  const { content = '', sequence = '1st', customSelector = '' } = target;
  if (!customSelector) {
    return null;
  }
  const selector = customSelector.replace(/\\\\/g, '\\');
  const els = roots.flatMap((root) => Array.from(root.querySelectorAll<HTMLElement>(selector)));
  if (els.length === 0) {
    return null;
  }
  const el = els[sequenceMapping[sequence] ?? 0] || els[0];
  if (content && el.innerText.trim() !== content) {
    return null;
  }
  return el;
}
