import type { CSSProperties } from 'react';

import { document } from '@/utils';

/**
 * Where an inline shell's mount element goes in the host document: inside a
 * parent (append / prepend) or next to an anchor (before / after). Shared by
 * the banner and the embed; the page-level banner placements and the embed's
 * cover placement are resolved by their own components.
 */
export type InlineMountPlacement = {
  parent: HTMLElement;
  insertMode: 'append' | 'prepend' | 'before' | 'after';
  anchor?: Element;
};

/** The element-relative placement values the banner and the embed share. */
export const INLINE_ELEMENT_PLACEMENTS = {
  TOP_OF_CONTAINER_ELEMENT: 'top-of-container-element',
  BOTTOM_OF_CONTAINER_ELEMENT: 'bottom-of-container-element',
  IMMEDIATELY_BEFORE_ELEMENT: 'immediately-before-element',
  IMMEDIATELY_AFTER_ELEMENT: 'immediately-after-element',
} as const;

/**
 * Applies React CSSProperties to an HTMLElement's inline style.
 * Uses the DOM's native style assignment so the browser normalizes values
 * (e.g. numbers for dimensions become "px", unitless props like zIndex stay numeric).
 * Custom properties (--*) use setProperty for correct handling.
 */
export const applyStyleObject = (el: HTMLElement, style: CSSProperties) => {
  el.style.cssText = '';
  for (const [key, value] of Object.entries(style)) {
    if (value === undefined || value === null) {
      continue;
    }
    if (key.startsWith('--')) {
      el.style.setProperty(key, String(value));
      continue;
    }
    (el.style as unknown as Record<string, string | number>)[key] = value;
  }
};

/**
 * Resolves an element-relative placement against its target. Returns null
 * for a placement this helper does not own, or when the target cannot host it.
 */
export const resolveElementMountPlacement = (
  placement: string,
  targetElement?: Element | null,
): InlineMountPlacement | null => {
  switch (placement) {
    case INLINE_ELEMENT_PLACEMENTS.TOP_OF_CONTAINER_ELEMENT:
      if (targetElement instanceof HTMLElement) {
        return { parent: targetElement, insertMode: 'prepend' };
      }
      return null;
    case INLINE_ELEMENT_PLACEMENTS.BOTTOM_OF_CONTAINER_ELEMENT:
      if (targetElement instanceof HTMLElement) {
        return { parent: targetElement, insertMode: 'append' };
      }
      return null;
    case INLINE_ELEMENT_PLACEMENTS.IMMEDIATELY_BEFORE_ELEMENT:
      if (targetElement?.parentElement) {
        return { parent: targetElement.parentElement, insertMode: 'before', anchor: targetElement };
      }
      return null;
    case INLINE_ELEMENT_PLACEMENTS.IMMEDIATELY_AFTER_ELEMENT:
      if (targetElement?.parentElement) {
        return { parent: targetElement.parentElement, insertMode: 'after', anchor: targetElement };
      }
      return null;
    default:
      return null;
  }
};

/** Inserts the mount element at its placement; idempotent when already there. */
export const insertMountEl = (mountEl: HTMLDivElement, placement: InlineMountPlacement) => {
  const { parent, insertMode, anchor } = placement;

  if (!parent.isConnected) {
    return;
  }

  if (mountEl.parentNode === parent) {
    if (insertMode === 'append' && mountEl === parent.lastChild) return;
    if (insertMode === 'prepend' && mountEl === parent.firstChild) return;
    if (insertMode === 'before' && anchor && mountEl.nextSibling === anchor) return;
    if (insertMode === 'after' && anchor && anchor.nextSibling === mountEl) return;
  }

  switch (insertMode) {
    case 'append':
      parent.appendChild(mountEl);
      break;
    case 'prepend':
      parent.insertBefore(mountEl, parent.firstChild);
      break;
    case 'before':
      if (anchor?.parentNode) {
        anchor.parentNode.insertBefore(mountEl, anchor);
      }
      break;
    case 'after':
      if (anchor?.parentNode) {
        anchor.parentNode.insertBefore(mountEl, anchor.nextSibling);
      }
      break;
    default:
      parent.appendChild(mountEl);
  }
};

/** Creates the detached mount element an inline shell portals into. */
export const createMountEl = (className: string): HTMLDivElement | null => {
  if (!document?.createElement) {
    return null;
  }
  const el = document.createElement('div');
  el.className = className;
  return el;
};

/** Takes the mount element out of the page (keeps it for a later re-insert). */
export const detachMountEl = (mountEl: HTMLDivElement | null) => {
  if (mountEl?.parentNode) {
    mountEl.parentNode.removeChild(mountEl);
  }
};
