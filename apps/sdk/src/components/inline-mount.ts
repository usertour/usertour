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

/** Marks the mount elements this module created, so they recognize each other. */
const MOUNT_MARKER_ATTRIBUTE = 'data-usertour-inline-mount';

const isMountEl = (node: Node | null | undefined): node is HTMLElement => {
  return node instanceof HTMLElement && node.hasAttribute(MOUNT_MARKER_ATTRIBUTE);
};

/**
 * The mount elements already sitting at a placement, in document order: the
 * run of marked siblings at the parent's start (prepend) or end (append), or
 * the run touching the anchor (before: just above it, after: just below it).
 * A newcomer joins the run's end, so several shells on one target keep their
 * delivery order and never move each other — and a moved mount is not
 * harmless: moving an iframe reloads its document, while the frame keeps
 * rendering into the old one.
 */
const mountRun = (placement: InlineMountPlacement): HTMLElement[] => {
  const { parent, insertMode, anchor } = placement;
  const run: HTMLElement[] = [];
  switch (insertMode) {
    case 'prepend': {
      let node: Node | null = parent.firstChild;
      while (isMountEl(node)) {
        run.push(node);
        node = node.nextSibling;
      }
      return run;
    }
    case 'append': {
      let node: Node | null = parent.lastChild;
      while (isMountEl(node)) {
        run.unshift(node);
        node = node.previousSibling;
      }
      return run;
    }
    case 'before': {
      let node: Node | null = anchor?.previousSibling ?? null;
      while (isMountEl(node)) {
        run.unshift(node);
        node = node.previousSibling;
      }
      return run;
    }
    case 'after': {
      let node: Node | null = anchor?.nextSibling ?? null;
      while (isMountEl(node)) {
        run.push(node);
        node = node.nextSibling;
      }
      return run;
    }
    default:
      return run;
  }
};

/**
 * Inserts the mount element at its placement, at the end of the run already
 * there. A placement is taken once per target and released before the next
 * one (`placeInFlow`, the embed's `placeCover`), so a placed mount is never
 * moved in place.
 */
export const insertMountEl = (mountEl: HTMLDivElement, placement: InlineMountPlacement): void => {
  const { parent, insertMode, anchor } = placement;

  if (!parent.isConnected) {
    return;
  }

  const run = mountRun(placement);
  const lastInRun = run.length > 0 ? run[run.length - 1] : null;

  switch (insertMode) {
    case 'append':
      parent.appendChild(mountEl);
      break;
    case 'prepend':
      parent.insertBefore(mountEl, lastInRun ? lastInRun.nextSibling : parent.firstChild);
      break;
    case 'before':
      if (anchor?.parentNode) {
        anchor.parentNode.insertBefore(mountEl, anchor);
      }
      break;
    case 'after':
      if (anchor?.parentNode) {
        anchor.parentNode.insertBefore(mountEl, (lastInRun ?? anchor).nextSibling);
      }
      break;
    default:
      parent.appendChild(mountEl);
  }
};

/** Creates the detached, marked mount element an inline shell portals into. */
export const createMountEl = (className: string): HTMLDivElement | null => {
  if (!document?.createElement) {
    return null;
  }
  const el = document.createElement('div');
  el.className = className;
  el.setAttribute(MOUNT_MARKER_ATTRIBUTE, '');
  return el;
};

/** Takes the mount element out of the page (keeps it for a later re-insert). */
export const detachMountEl = (mountEl: HTMLDivElement | null) => {
  if (mountEl?.parentNode) {
    mountEl.parentNode.removeChild(mountEl);
  }
};

/** Whether the mount element already sits in the run at `placement`. */
export const isMountAt = (mountEl: HTMLDivElement, placement: InlineMountPlacement): boolean =>
  mountRun(placement).includes(mountEl);

/** Where a shell's mount goes for a target; null when it cannot be placed there. */
export type MountResolver = (target: Element | null) => InlineMountPlacement | null;

/**
 * A mount element placed in the page. `holds` says whether the mount still
 * sits where the placement puts it for `target` — the sibling of a target
 * that was replaced in place does, so nothing needs to move; `restyle`
 * updates the shell's own style in place (its measured height, its z-index);
 * `release` takes the mount out of the page and undoes whatever the placement
 * did to hold it there.
 */
export type PlacedMount = {
  holds: (target: Element | null) => boolean;
  restyle: (style: CSSProperties) => void;
  release: () => void;
};

/** Places the mount element in the document flow where `resolve` puts it for `target`. */
export const placeInFlow = (
  mountEl: HTMLDivElement,
  resolve: MountResolver,
  target: Element | null,
  style: CSSProperties,
): PlacedMount | null => {
  const placement = resolve(target);
  if (!placement) {
    return null;
  }
  applyStyleObject(mountEl, style);
  insertMountEl(mountEl, placement);
  return {
    holds: (next) => {
      const nextPlacement = resolve(next);
      return nextPlacement !== null && isMountAt(mountEl, nextPlacement);
    },
    restyle: (next) => applyStyleObject(mountEl, next),
    release: () => detachMountEl(mountEl),
  };
};
