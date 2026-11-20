import { CSSProperties } from 'react';

/** Gap kept between a floating surface and the edge of the viewport. */
export const SURFACE_VIEWPORT_MARGIN = 16;

/**
 * Read by `.usertour-widget-surface-viewport` (packages/assets/sdk/index.css)
 * to cap the content frame's height: the frame is a descendant of the surface
 * in the host document, so the value set on the surface reaches it.
 */
const SURFACE_INSET_Y_VAR = '--usertour-widget-surface-inset-y';

const inset = (anchored: boolean, offset: number, extra = 0) =>
  (anchored ? Math.max(0, offset) + SURFACE_VIEWPORT_MARGIN : SURFACE_VIEWPORT_MARGIN * 2) + extra;

/**
 * Style that keeps a fixed-position surface inside the viewport: its width
 * never exceeds the viewport, and its content frame's height is capped (the
 * content then scrolls inside the frame — see useFrameContentHeight).
 *
 * An edge-anchored axis loses its offset plus one margin; a centered axis
 * loses a margin on both sides. `reservedHeight` is space the surface needs
 * beyond its frame (a bubble's avatar and notch).
 */
export const computeViewportClampStyle = (
  position = 'center',
  offsetX = 0,
  offsetY = 0,
  reservedHeight = 0,
): CSSProperties => {
  const anchoredX = position.startsWith('left') || position.startsWith('right');
  const anchoredY = position.endsWith('Top') || position.endsWith('Bottom');
  return {
    maxWidth: `calc(100vw - ${inset(anchoredX, offsetX)}px)`,
    [SURFACE_INSET_Y_VAR]: `${inset(anchoredY, offsetY, reservedHeight)}px`,
  } as CSSProperties;
};
