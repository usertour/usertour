import { smoothScroll } from '@usertour/dom';
import type { UserTourTypes } from '@usertour/types';
import { window } from '@/utils';

export type ScrollPadding = Required<UserTourTypes.ScrollPadding>;

const SIDES = ['top', 'right', 'bottom', 'left'] as const;

/**
 * The padding as the scroll uses it: every side a finite, non-negative number
 * of pixels (anything else counts as 0), or null when no side has any.
 */
export const normalizeScrollPadding = (
  padding: UserTourTypes.ScrollPadding | null | undefined,
): ScrollPadding | null => {
  if (!padding || typeof padding !== 'object') {
    return null;
  }
  const side = (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
  const normalized = {
    top: side(padding.top),
    right: side(padding.right),
    bottom: side(padding.bottom),
    left: side(padding.left),
  };
  return SIDES.some((name) => normalized[name] > 0) ? normalized : null;
};

type Box = { top: number; right: number; bottom: number; left: number };

const scrolls = (overflow: string) =>
  overflow === 'auto' || overflow === 'scroll' || overflow === 'overlay';

const parentOf = (node: Element): Element | null =>
  node.parentElement ?? (node.getRootNode() as ShadowRoot).host ?? null;

/** The part of an element its content is shown in: inside the borders, without scrollbars. */
const contentBox = (node: Element): Box => {
  const rect = node.getBoundingClientRect();
  const top = rect.top + node.clientTop;
  const left = rect.left + node.clientLeft;
  return { top, left, bottom: top + node.clientHeight, right: left + node.clientWidth };
};

const intersect = (a: Box, b: Box): Box => ({
  top: Math.max(a.top, b.top),
  right: Math.min(a.right, b.right),
  bottom: Math.min(a.bottom, b.bottom),
  left: Math.max(a.left, b.left),
});

const shift = (box: Box, x: number, y: number): Box => ({
  top: box.top + y,
  right: box.right + x,
  bottom: box.bottom + y,
  left: box.left + x,
});

type Measure = {
  /** The target, in the page's viewport. */
  rect: Box;
  /** The part of the page's viewport the target can be seen in, padding left clear. */
  visible: Box;
  /** The height of the smallest viewport or scrolling container the target is in. */
  room: number;
  /** Whether only the page itself scrolls to reach the target. */
  pageOnly: boolean;
};

/**
 * Where the target is and what it can be seen through: every scrolling
 * container and same-origin frame between it and the page, then the page's
 * viewport less the padding.
 */
const measure = (el: Element, padding: ScrollPadding | null): Measure => {
  let rect: Box = el.getBoundingClientRect();
  let visible: Box = {
    top: Number.NEGATIVE_INFINITY,
    right: Number.POSITIVE_INFINITY,
    bottom: Number.POSITIVE_INFINITY,
    left: Number.NEGATIVE_INFINITY,
  };
  let room = Number.POSITIVE_INFINITY;
  let pageOnly = true;
  let node: Element = el;
  for (;;) {
    const doc = node.ownerDocument;
    const view = doc.defaultView;
    for (
      let up = parentOf(node);
      up && up !== doc.body && up !== doc.documentElement;
      up = parentOf(up)
    ) {
      const style = view?.getComputedStyle(up);
      const scrollsY = !!style && scrolls(style.overflowY) && up.scrollHeight > up.clientHeight;
      const scrollsX = !!style && scrolls(style.overflowX) && up.scrollWidth > up.clientWidth;
      if (scrollsY || scrollsX) {
        const box = contentBox(up);
        visible = intersect(visible, box);
        room = Math.min(room, box.bottom - box.top);
        pageOnly = false;
      }
    }
    const isPage = !view || view === window;
    const viewport = {
      top: isPage ? (padding?.top ?? 0) : 0,
      left: isPage ? (padding?.left ?? 0) : 0,
      bottom: (view?.innerHeight ?? 0) - (isPage ? (padding?.bottom ?? 0) : 0),
      right: (view?.innerWidth ?? 0) - (isPage ? (padding?.right ?? 0) : 0),
    };
    visible = intersect(visible, viewport);
    room = Math.min(room, viewport.bottom - viewport.top);
    const frame = isPage ? null : (view?.frameElement ?? null);
    if (!frame) {
      return { rect, visible, room, pageOnly };
    }
    pageOnly = false;
    const box = contentBox(frame);
    rect = shift(rect, box.left, box.top);
    visible = intersect(shift(visible, box.left, box.top), box);
    node = frame;
  }
};

/**
 * The default scroll that brings a tooltip's target into view.
 *
 * A target that can already be seen whole is left where it is. Otherwise one
 * that fits is centred, and a taller one is brought in by its top: centred,
 * its top would be cut off and the user would land in the middle of it.
 *
 * When only the page scrolls, the distance is worked out here and the padding
 * is kept clear, so nothing on the host's page is touched. A target in a
 * scrolling container or a frame is scrolled the browser's way, each container
 * as needed; the padding only counts towards whether it is already in view.
 */
export const scrollTargetIntoView = (el: Element, padding: ScrollPadding | null): void => {
  const { rect, visible, room, pageOnly } = measure(el, padding);
  const height = rect.bottom - rect.top;
  const width = rect.right - rect.left;
  if (
    rect.top >= visible.top &&
    rect.bottom <= visible.bottom &&
    rect.left >= visible.left &&
    rect.right <= visible.right
  ) {
    return;
  }
  const tall = height > room;

  if (!pageOnly || !window) {
    void smoothScroll(el, { block: tall ? 'start' : 'center' });
    return;
  }

  const roomHeight = visible.bottom - visible.top;
  let top = 0;
  if (rect.top < visible.top || rect.bottom > visible.bottom) {
    top = tall ? rect.top - visible.top : rect.top - visible.top - (roomHeight - height) / 2;
  }
  let left = 0;
  if (rect.left < visible.left || rect.right > visible.right) {
    left =
      width > visible.right - visible.left || rect.left < visible.left
        ? rect.left - visible.left
        : rect.right - visible.right;
  }
  window.scrollBy({ top, left, behavior: 'smooth' });
};
