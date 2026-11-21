import { CSSProperties } from 'react';

/** Gap kept between a floating surface and the edge of the viewport. */
export const SURFACE_VIEWPORT_MARGIN = 16;

/**
 * Read by `.usertour-widget-surface-viewport` (packages/assets/sdk/index.css)
 * to cap the content frame's height: the frame is a descendant of the surface
 * in the host document, so the values set on the surface reach it.
 */
const SURFACE_INSET_Y_VAR = '--usertour-widget-surface-inset-y';
const SURFACE_AVAILABLE_HEIGHT_VAR = '--usertour-widget-surface-available-height';

/** A surface squeezed by its target or its offset keeps at least this much. */
const MIN_SURFACE_HEIGHT = 120;
const MIN_SURFACE_WIDTH = 240;

const isAnchoredX = (position: string) =>
  position.startsWith('left') || position.startsWith('right');
const isAnchoredY = (position: string) => position.endsWith('Top') || position.endsWith('Bottom');

/**
 * What an axis loses to the viewport's edges. Edge-anchored: its offset plus
 * one margin. Centered: a margin on both sides, and twice its offset — the
 * offset moves the center, so the surface has to give way on both sides.
 */
const inset = (anchored: boolean, offset: number) =>
  anchored
    ? Math.max(0, offset) + SURFACE_VIEWPORT_MARGIN
    : (SURFACE_VIEWPORT_MARGIN + Math.abs(offset)) * 2;

/**
 * Style that keeps a fixed-position surface inside the viewport: its width
 * never exceeds the viewport, and its content frame's height is capped (the
 * content then scrolls inside the frame — see useFrameContentHeight).
 *
 * `reservedHeight` is space the surface needs beyond its frame (a bubble's
 * avatar and notch).
 */
export const computeViewportClampStyle = (
  position = 'center',
  offsetX = 0,
  offsetY = 0,
  reservedHeight = 0,
): CSSProperties => {
  // computePositionStyle ignores both offsets for a plain 'center'.
  const [x, y] = position === 'center' ? [0, 0] : [offsetX, offsetY];
  return {
    maxWidth: `calc(100vw - ${inset(isAnchoredX(position), x)}px)`,
    [SURFACE_INSET_Y_VAR]: `${inset(isAnchoredY(position), y) + reservedHeight}px`,
  } as CSSProperties;
};

/** The largest offset on an axis `room` long that still leaves the surface `min` of it. */
const fitOffset = (anchored: boolean, offset: number, room: number, min: number) => {
  if (anchored) {
    return Math.min(offset, Math.max(0, room - SURFACE_VIEWPORT_MARGIN - min));
  }
  const limit = Math.max(0, (room - SURFACE_VIEWPORT_MARGIN * 2 - min) / 2);
  return Math.max(-limit, Math.min(limit, offset));
};

/**
 * The offsets a fixed-position surface can actually take in this viewport.
 * The clamp above takes an offset out of the surface's size, so an offset the
 * viewport has no room for would shrink the surface to nothing; it is cut
 * back instead, until the surface keeps a usable width and height.
 */
export const fitOffsetsToViewport = (
  position: string,
  offsetX: number,
  offsetY: number,
  viewport: { width: number; height: number },
  reservedHeight = 0,
): [number, number] => {
  if (position === 'center') {
    return [offsetX, offsetY];
  }
  return [
    fitOffset(isAnchoredX(position), offsetX, viewport.width, MIN_SURFACE_WIDTH),
    fitOffset(isAnchoredY(position), offsetY, viewport.height - reservedHeight, MIN_SURFACE_HEIGHT),
  ];
};

/**
 * For a surface placed against a target: caps its frame to the room left on
 * the side it ended up on (floating-ui's `size` middleware reports it), which
 * is less than the viewport whenever the target is not at its edge. Returns
 * whether that room is below the minimum the surface keeps.
 */
export const applyAvailableHeight = (floating: HTMLElement, availableHeight: number) => {
  const room = Math.floor(availableHeight) - SURFACE_VIEWPORT_MARGIN;
  floating.style.setProperty(
    SURFACE_AVAILABLE_HEIGHT_VAR,
    `${Math.max(MIN_SURFACE_HEIGHT, room)}px`,
  );
  return room < MIN_SURFACE_HEIGHT;
};
