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

/** Anything but `visible` cuts off what overflows; all but `clip` can be scrolled, by code at least. */
const clips = (overflow: string) => overflow !== '' && overflow !== 'visible';

const parentOf = (node: Element): Element | null =>
  node.parentElement ?? (node.getRootNode() as ShadowRoot).host ?? null;

/** How much a CSS transform has scaled an element, on each axis. */
const scaleOf = (node: Element, rect: DOMRect) => {
  const { offsetWidth, offsetHeight } = node as HTMLElement;
  return {
    x: offsetWidth > 0 && rect.width > 0 ? rect.width / offsetWidth : 1,
    y: offsetHeight > 0 && rect.height > 0 ? rect.height / offsetHeight : 1,
  };
};

/** The part of an element its content is shown in: inside the borders, without scrollbars. */
const contentBox = (node: Element) => {
  const rect = node.getBoundingClientRect();
  const scale = scaleOf(node, rect);
  const top = rect.top + node.clientTop * scale.y;
  const left = rect.left + node.clientLeft * scale.x;
  const box: Box = {
    top,
    left,
    bottom: top + node.clientHeight * scale.y,
    right: left + node.clientWidth * scale.x,
  };
  return { box, scale };
};

const intersect = (a: Box, b: Box): Box => ({
  top: Math.max(a.top, b.top),
  right: Math.min(a.right, b.right),
  bottom: Math.min(a.bottom, b.bottom),
  left: Math.max(a.left, b.left),
});

const within = (inner: Box, outer: Box) =>
  inner.top >= outer.top - 0.5 &&
  inner.bottom <= outer.bottom + 0.5 &&
  inner.left >= outer.left - 0.5 &&
  inner.right <= outer.right + 0.5;

/** A box inside a frame, as it lies in the frame's parent: scaled, then moved to the frame. */
const project = (box: Box, frame: Box, scale: { x: number; y: number }): Box => ({
  top: frame.top + box.top * scale.y,
  right: frame.left + box.right * scale.x,
  bottom: frame.top + box.bottom * scale.y,
  left: frame.left + box.left * scale.x,
});

/** Whether the host's own CSS sets a scroll-padding on the page (read, never written). */
const hostHasScrollPadding = (): boolean => {
  const style = window?.getComputedStyle(window.document.documentElement);
  const set = (value: string | undefined) => !!value && value !== 'auto' && value !== '0px';
  return (
    set(style?.scrollPaddingTop) ||
    set(style?.scrollPaddingRight) ||
    set(style?.scrollPaddingBottom) ||
    set(style?.scrollPaddingLeft)
  );
};

type Measure = {
  /** The target, in the page's viewport. */
  rect: Box;
  /** The part of the page's viewport the target can be seen in, padding left clear. */
  visible: Box;
  /** The page's viewport, padding left clear. */
  page: Box;
  /** The height of the smallest viewport or clipping container the target is in. */
  room: number;
  /** Whether scrolling the page itself is all it takes to reach the target. */
  pageOnly: boolean;
};

/**
 * Where the target is and what it can be seen through: every container that
 * clips it and same-origin frame between it and the page, then the page's
 * viewport less the padding.
 */
const measure = (el: Element, padding: ScrollPadding): Measure => {
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
      const clipsY = !!style && clips(style.overflowY) && up.scrollHeight > up.clientHeight;
      const clipsX = !!style && clips(style.overflowX) && up.scrollWidth > up.clientWidth;
      if (clipsY || clipsX) {
        const { box } = contentBox(up);
        visible = intersect(visible, box);
        room = Math.min(room, box.bottom - box.top);
        // A container the target already shows whole in has nothing to scroll.
        pageOnly = pageOnly && within(rect, box);
      }
    }
    const isPage = !view || view === window;
    const viewport = {
      top: isPage ? padding.top : 0,
      left: isPage ? padding.left : 0,
      bottom: (view?.innerHeight ?? 0) - (isPage ? padding.bottom : 0),
      right: (view?.innerWidth ?? 0) - (isPage ? padding.right : 0),
    };
    visible = intersect(visible, viewport);
    room = Math.min(room, viewport.bottom - viewport.top);
    const frame = isPage ? null : (view?.frameElement ?? null);
    if (!frame) {
      return { rect, visible, page: viewport, room, pageOnly };
    }
    pageOnly = false;
    const { box, scale } = contentBox(frame);
    rect = project(rect, box, scale);
    visible = intersect(project(visible, box, scale), box);
    room *= scale.y;
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
 * Without a padding from setScrollPadding() the browser does the scrolling,
 * each container as needed and the host's CSS scroll-padding kept clear. How
 * much that is is not worked out here, so on a page that has one the target
 * is always scrolled to: it may lie under what the host keeps clear.
 *
 * With a padding, and when scrolling the page is all it takes, the distance is
 * worked out here instead: that keeps the padding clear without touching the
 * host's page, and the padding stands in for any CSS scroll-padding. A target
 * in a container or a frame is still scrolled the browser's way then, so the
 * padding only counts towards whether it is already in view.
 */
export const scrollTargetIntoView = (el: Element, padding: ScrollPadding | null): void => {
  const { rect, visible, page, room, pageOnly } = measure(
    el,
    padding ?? { top: 0, right: 0, bottom: 0, left: 0 },
  );
  const height = rect.bottom - rect.top;
  const width = rect.right - rect.left;
  if ((padding || !hostHasScrollPadding()) && within(rect, visible)) {
    return;
  }
  const tall = height > room;

  if (!padding || !pageOnly || !window) {
    void smoothScroll(el, { block: tall ? 'start' : 'center' });
    return;
  }

  // Against the page's viewport alone: a container the target shows whole in moves with the page.
  let top = 0;
  if (rect.top < page.top || rect.bottom > page.bottom) {
    top = tall ? rect.top - page.top : rect.top - page.top - (page.bottom - page.top - height) / 2;
  }
  let left = 0;
  if (rect.left < page.left || rect.right > page.right) {
    left =
      width > page.right - page.left || rect.left < page.left
        ? rect.left - page.left
        : rect.right - page.right;
  }
  window.scrollBy({ top, left, behavior: 'smooth' });
};
