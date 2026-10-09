import { getComputedStyle } from './getComputedStyle';
import { getWindow } from './getWindow';
import { isElement } from './is';
import type { Rect, Strategy } from './types';

/**
 * The part of Floating UI's platform this needs: the clipping rect of an
 * element within its own window.
 */
export type ClippingRectPlatform = {
  getClippingRect(args: {
    element: Element;
    boundary: 'clippingAncestors';
    rootBoundary: 'viewport';
    strategy: Strategy;
  }): Rect | Promise<Rect>;
};

/**
 * The element that embeds `element`'s window, when that window is a frame
 * whose parent is same-origin; null in the top window and under a
 * cross-origin parent.
 */
export function getFrameElement(element: Element): HTMLElement | null {
  return getWindow(element).frameElement as HTMLElement | null;
}

/**
 * The clipping rect of an element that lives in a same-origin frame, in the
 * top window's viewport coordinates: the element's own clipping ancestors and
 * viewport, then those of each enclosing frame element, intersected.
 *
 * Floating UI clips a reference within the reference's own window, so for a
 * reference inside a frame it compares a top-window reference rect against a
 * frame-local viewport. Passing this rect as both `boundary` and
 * `rootBoundary` keeps both sides in the same space. Returns null for an
 * element in the top window, where the defaults are right.
 */
export async function getClippingRectAcrossFrames(
  platform: ClippingRectPlatform,
  element: Element,
  strategy: Strategy,
): Promise<Rect | null> {
  let frame = getFrameElement(element);
  if (!frame) {
    return null;
  }
  let clippingRect = await platform.getClippingRect({
    element,
    boundary: 'clippingAncestors',
    rootBoundary: 'viewport',
    strategy,
  });
  while (frame) {
    const origin = getContentBoxOrigin(frame);
    clippingRect = {
      ...clippingRect,
      x: clippingRect.x + origin.x,
      y: clippingRect.y + origin.y,
    };
    const frameClippingRect = await platform.getClippingRect({
      element: frame,
      boundary: 'clippingAncestors',
      rootBoundary: 'viewport',
      strategy,
    });
    clippingRect = intersect(clippingRect, frameClippingRect);
    frame = getFrameElement(frame);
  }
  return clippingRect;
}

/** The slice of a Floating UI middleware state `getBoundaryAcrossFrames` reads. */
export type FrameBoundaryState = {
  elements: { reference: unknown };
  platform: ClippingRectPlatform;
  strategy: Strategy;
};

/**
 * `boundary` and `rootBoundary` for a reference inside a same-origin frame,
 * to spread into `hide()` or `detectOverflow()` options; undefined for a
 * reference in the top window, where Floating UI's defaults are right.
 */
export async function getBoundaryAcrossFrames(
  state: FrameBoundaryState,
): Promise<{ boundary: Rect; rootBoundary: Rect } | undefined> {
  const { elements, platform, strategy } = state;
  if (!isElement(elements.reference)) {
    return undefined;
  }
  const clippingRect = await getClippingRectAcrossFrames(platform, elements.reference, strategy);
  return clippingRect ? { boundary: clippingRect, rootBoundary: clippingRect } : undefined;
}

/** Where the frame's document starts, in the frame's own window's viewport coordinates. */
function getContentBoxOrigin(frame: HTMLElement) {
  const rect = frame.getBoundingClientRect();
  const style = getComputedStyle(frame);
  return {
    x: rect.left + frame.clientLeft + Number.parseFloat(style.paddingLeft),
    y: rect.top + frame.clientTop + Number.parseFloat(style.paddingTop),
  };
}

function intersect(first: Rect, second: Rect): Rect {
  const left = Math.max(first.x, second.x);
  const top = Math.max(first.y, second.y);
  const right = Math.min(first.x + first.width, second.x + second.width);
  const bottom = Math.min(first.y + first.height, second.y + second.height);
  return { x: left, y: top, width: right - left, height: bottom - top };
}
