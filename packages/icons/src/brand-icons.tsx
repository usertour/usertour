import React from 'react';

import type { IconProps } from './icon';

/**
 * Visual Studio Code mark, monochrome (single `currentColor` fill) to match
 * the rest of the client-icon row. This is the exact outline Microsoft's
 * brand asset uses as its mask silhouette (see
 * https://code.visualstudio.com/brand) — not a redrawn approximation.
 *
 * The source path fills its full 0-100 box edge-to-edge, unlike RemixIcon
 * glyphs (~2px of breathing room on a 24px grid, an ~8.3% margin) — at the
 * same container size that made this icon read as visibly bigger/bolder
 * than its neighbors. The viewBox pads by the same ~8.3% ratio so it sits
 * at the same optical size, not just the same box size.
 */
export const VSCodeIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => (
    <svg
      width="16"
      height="16"
      viewBox="-10 -10 120 120"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      ref={forwardedRef}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M70.9119 99.3171C72.4869 99.9307 74.2828 99.8914 75.8725 99.1264L96.4608 89.2197C98.6242 88.1787 100 85.9892 100 83.5872V16.4133C100 14.0113 98.6243 11.8218 96.4609 10.7808L75.8725 0.873756C73.7862 -0.130129 71.3446 0.11576 69.5135 1.44695C69.252 1.63711 69.0028 1.84943 68.769 2.08341L29.3551 38.0415L12.1872 25.0096C10.589 23.7965 8.35363 23.8959 6.86933 25.2461L1.36303 30.2549C-0.452552 31.9064 -0.454633 34.7627 1.35853 36.417L16.2471 50.0001L1.35853 63.5832C-0.454633 65.2374 -0.452552 68.0938 1.36303 69.7453L6.86933 74.7541C8.35363 76.1043 10.589 76.2037 12.1872 74.9905L29.3551 61.9587L68.769 97.9167C69.3925 98.5406 70.1246 99.0104 70.9119 99.3171ZM75.0152 27.2989L45.1091 50.0001L75.0152 72.7012V27.2989Z"
      />
    </svg>
  ),
);

VSCodeIcon.displayName = 'VSCodeIcon';
