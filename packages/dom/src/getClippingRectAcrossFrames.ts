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
 * The clipping rect of an element that lives in a same-origin frame below
 * `targetWindow`, in `targetWindow`'s viewport coordinates: the element's own
 * clipping ancestors and viewport, then those of each frame element on the way
 * up to `targetWindow`, intersected.
 *
 * Floating UI expresses a reference's rect in the floating element's window
 * but clips it within the reference's own window, so for a reference inside a
 * frame the two are in different spaces. Passing this rect as both `boundary`
 * and `rootBoundary`, with the floating element's window as `targetWindow`,
 * keeps both sides in the same space. The walk stops at `targetWindow`, which
 * is not the top window when the page itself is embedded in a frame. Returns
 * null for an element in `targetWindow` itself, where the defaults are right,
 * and for one that is not below it.
 */
export async function getClippingRectAcrossFrames(
  platform: ClippingRectPlatform,
  element: Element,
  strategy: Strategy,
  targetWindow: Window,
): Promise<Rect | null> {
  if (getWindow(element) === targetWindow) {
    return null;
  }
  let clippingRect = await platform.getClippingRect({
    element,
    boundary: 'clippingAncestors',
    rootBoundary: 'viewport',
    strategy,
  });
  let frame = getFrameElement(element);
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
    if (getWindow(frame) === targetWindow) {
      return clippingRect;
    }
    frame = getFrameElement(frame);
  }
  return null;
}

/** The slice of a Floating UI middleware state `getBoundaryAcrossFrames` reads. */
export type FrameBoundaryState = {
  elements: { reference: unknown; floating: unknown };
  platform: ClippingRectPlatform;
  strategy: Strategy;
};

/**
 * `boundary` and `rootBoundary` for a reference that lives in a same-origin
 * frame below the floating element's window, to spread into `hide()` or
 * `detectOverflow()` options; undefined for a reference in the floating
 * element's own window, where Floating UI's defaults are right.
 */
export async function getBoundaryAcrossFrames(
  state: FrameBoundaryState,
): Promise<{ boundary: Rect; rootBoundary: Rect } | undefined> {
  const { elements, platform, strategy } = state;
  if (!isElement(elements.reference) || !isElement(elements.floating)) {
    return undefined;
  }
  const clippingRect = await getClippingRectAcrossFrames(
    platform,
    elements.reference,
    strategy,
    getWindow(elements.floating),
  );
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
