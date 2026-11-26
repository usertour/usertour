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

/**
 * The scroll-padding the host's own CSS sets on the page (read, never written),
 * which the browser keeps clear when it scrolls something into view. Null when
 * a side is neither `auto`, a length in px nor a percentage (a `calc()` mixing
 * the two, say): only the browser can tell how much that is.
 */
const hostScrollPadding = (): ScrollPadding | null => {
  const style = window?.getComputedStyle(window.document.documentElement);
  const height = window?.innerHeight ?? 0;
  const width = window?.innerWidth ?? 0;
  const px = (value: string | undefined, size: number) => {
    const text = (value ?? '').trim();
    if (text === '' || text === 'auto') {
      return 0;
    }
    const match = /^(\d*\.?\d+)(px|%)$/.exec(text);
    if (!match) {
      return null;
    }
    return match[2] === '%' ? (Number(match[1]) / 100) * size : Number(match[1]);
  };
  const top = px(style?.scrollPaddingTop, height);
  const right = px(style?.scrollPaddingRight, width);
  const bottom = px(style?.scrollPaddingBottom, height);
  const left = px(style?.scrollPaddingLeft, width);
  return top === null || right === null || bottom === null || left === null
    ? null
    : { top, right, bottom, left };
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
 * The browser does the scrolling, each container as needed and the host's CSS
 * scroll-padding kept clear. Only with a padding from setScrollPadding(), and
 * only when the page alone scrolls, is the distance worked out here instead:
 * that keeps the padding clear without touching the host's page. A target in a
 * container or a frame is still scrolled the browser's way then, so the
 * padding only counts towards whether it is already in view. So is any target
 * on a page whose CSS scroll-padding cannot be read as a length.
 */
export const scrollTargetIntoView = (el: Element, padding: ScrollPadding | null): void => {
  // Whichever keeps more clear: the host may have both a CSS scroll-padding and ours.
  const host = hostScrollPadding();
  const clear = {
    top: Math.max(host?.top ?? 0, padding?.top ?? 0),
    right: Math.max(host?.right ?? 0, padding?.right ?? 0),
    bottom: Math.max(host?.bottom ?? 0, padding?.bottom ?? 0),
    left: Math.max(host?.left ?? 0, padding?.left ?? 0),
  };
  const { rect, visible, page, room, pageOnly } = measure(el, clear);
  const height = rect.bottom - rect.top;
  const width = rect.right - rect.left;
  // With a host padding only the browser can work out, it may lie under what that keeps clear.
  if (host && within(rect, visible)) {
    return;
  }
  const tall = height > room;

  if (!padding || !host || !pageOnly || !window) {
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
