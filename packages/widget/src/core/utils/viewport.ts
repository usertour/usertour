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

/** A surface squeezed by its target keeps at least this much height. */
const MIN_AVAILABLE_HEIGHT = 120;

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
  const anchoredX = position.startsWith('left') || position.startsWith('right');
  const anchoredY = position.endsWith('Top') || position.endsWith('Bottom');
  return {
    maxWidth: `calc(100vw - ${inset(anchoredX, x)}px)`,
    [SURFACE_INSET_Y_VAR]: `${inset(anchoredY, y) + reservedHeight}px`,
  } as CSSProperties;
};

/**
 * For a surface placed against a target: caps its frame to the room left on
 * the side it ended up on (floating-ui's `size` middleware reports it), which
 * is less than the viewport whenever the target is not at its edge.
 */
export const applyAvailableHeight = (floating: HTMLElement, availableHeight: number) => {
  const height = Math.max(
    MIN_AVAILABLE_HEIGHT,
    Math.floor(availableHeight) - SURFACE_VIEWPORT_MARGIN,
  );
  floating.style.setProperty(SURFACE_AVAILABLE_HEIGHT_VAR, `${height}px`);
};
