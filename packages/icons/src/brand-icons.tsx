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

/**
 * HubSpot symbol (the sprocket alone, no wordmark), monochrome `currentColor`
 * like the other brand marks; the consumer picks the color. Drawn on a 24
 * grid that runs edge-to-edge, so the viewBox pads ~2px each side to sit at
 * RemixIcon's optical size.
 */
export const HubspotSymbolIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => (
    <svg
      width="16"
      height="16"
      viewBox="-2 -2 28 28"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      ref={forwardedRef}
    >
      <path d="M18.164 7.93V5.084a2.2 2.2 0 0 0 1.267-1.978v-.067A2.2 2.2 0 0 0 17.238.845h-.067a2.2 2.2 0 0 0-2.193 2.193v.067a2.2 2.2 0 0 0 1.252 1.973l.013.006v2.852a6.2 6.2 0 0 0-2.969 1.31l.012-.01-7.828-6.095A2.497 2.497 0 1 0 4.3 4.656l-.012.006 7.697 5.991a6.18 6.18 0 0 0-1.038 3.446 6.2 6.2 0 0 0 1.147 3.607l-.013-.02-2.342 2.343a2 2 0 0 0-.58-.095h-.002a2.033 2.033 0 1 0 2.033 2.033 2 2 0 0 0-.1-.595l.005.014 2.317-2.317a6.247 6.247 0 1 0 4.782-11.134l-.036-.005zm-.964 9.378a3.206 3.206 0 1 1 3.215-3.207v.002a3.206 3.206 0 0 1-3.207 3.207z" />
    </svg>
  ),
);

HubspotSymbolIcon.displayName = 'HubspotSymbolIcon';

/**
 * Mixpanel symbol, monochrome `currentColor`; same 24-grid padding as the
 * HubSpot symbol.
 */
export const MixpanelSymbolIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => (
    <svg
      width="16"
      height="16"
      viewBox="-2 -2 28 28"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      ref={forwardedRef}
    >
      <path d="M6.967 9.996h3.053c-.763-.477-1.048-1.145-1.431-2.384L7.443 3.366C6.919 1.458 6.49.551 4.39.551H.004v1.145h.621c1.286 0 1.431.477 1.814 1.908L3.44 7.326c.524 1.814 1.337 2.67 3.53 2.67zm7.06 0h3.053c2.194 0 2.956-.86 3.484-2.67l1.001-3.722c.382-1.431.57-1.908 1.814-1.908H24V.551h-4.34c-2.146 0-2.576.86-3.053 2.815l-1.145 4.246c-.384 1.286-.673 1.907-1.435 2.384m-4.007 4.008h4.007V9.996H10.02zM0 23.449h4.39c2.1 0 2.529-.907 3.053-2.815l1.146-4.246c.383-1.239.668-1.907 1.431-2.384H6.967c-2.194 0-3.007.86-3.531 2.67l-1.001 3.722c-.383 1.431-.524 1.907-1.814 1.907H0zm19.65 0h4.343v-1.146h-.622c-1.239 0-1.431-.476-1.814-1.907l-1.001-3.722c-.524-1.814-1.286-2.67-3.483-2.67h-3.046c.762.477 1.041 1.098 1.424 2.384l1.145 4.246c.477 1.955.907 2.815 3.054 2.815" />
    </svg>
  ),
);

MixpanelSymbolIcon.displayName = 'MixpanelSymbolIcon';

/**
 * Amplitude symbol (the circle mark), monochrome `currentColor`. The source
 * box is 1518x1580; the viewBox squares it up and pads by the same ~8% so it
 * matches the other symbols' optical size.
 */
export const AmplitudeSymbolIcon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ ...props }, forwardedRef) => (
    <svg
      width="16"
      height="16"
      viewBox="-189 -158 1896 1896"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
      ref={forwardedRef}
    >
      <path d="M685.5 389.6q8 17.2 15 34.8t13 35.6 10.9 36.3c18.7 58.4 38.6 130.8 60 215.3-80.9-1.3-162.6-2.3-241.9-3.1l-40.1-.6c45.3-184.4 100.6-324.3 141-357.3q1.2-.9 2.5-1.6 1.3-.6 2.7-1.1t2.9-.8q1.4-.3 2.9-.3 2.2.1 4.2.8 2.1.7 4 1.8 1.9 1.2 3.4 2.8 1.5 1.5 2.7 3.4 8.9 16.8 16.8 34" />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1517.3 789.8c0 436.1-339.7 789.7-758.7 789.7C339.7 1579.5 0 1226 0 789.8S339.7 0 758.6 0c419 0 758.7 353.6 758.7 789.8m-205.5 5.6c2.2-3.3 4-6.8 5.2-10.6 1.2-3.7 2-7.6 2.1-11.5.2-3.9-.1-7.9-1-11.7s-2.2-7.5-4.1-10.9-4.2-6.5-7-9.2c-2.7-2.8-5.9-5.1-9.3-7s-7-3.3-10.8-4.1h-1.7l-1.6-.2q-.7-.1-1.5-.2-.7 0-1.5-.1h-1.5l-5.4-.5c-127-9.6-257.7-13.4-380.4-16l-.2-.9c-59.7-233.1-134.2-471.4-234.7-471.4-93.7.3-178.3 157.1-251.1 465.4-51.4-.6-98.5-1.3-142.8-2.1h-6.8q-2-.1-4.1-.1l-4 .2q-2.1 0-4.1.2-2.1.2-4.1.4c-12.4 2.8-23.4 9.8-31.2 19.7-7.9 10-12 22.4-11.8 35.1s4.8 24.9 12.9 34.6c8.2 9.7 19.4 16.3 31.9 18.7l.5.6h139.4c-13 61.7-24.3 122.7-33.8 181.5l-4.2 25.8v1.3c0 3.8.6 7.7 1.8 11.3 1.1 3.7 2.9 7.1 5.2 10.2 2.2 3.1 5 5.9 8.1 8.1 3.1 2.3 6.5 4 10.2 5.2 3.6 1 7.4 1.5 11.2 1.3s7.5-1 11-2.4c3.5-1.3 6.8-3.3 9.6-5.8 2.9-2.4 5.4-5.3 7.3-8.6l1.1.9 68.6-228.7h330.7c25.2 99.4 51.5 202.1 86.1 298.4 18.6 51.5 61.9 172.1 134.4 172.7h.8c112.2 0 155.9-188.6 184.8-313.5 6.3-26.9 11.6-50.1 16.7-67.1l2-7.1.4-1.2q.1-.7.2-1.3.1-.7.1-1.3.1-.7.1-1.3c0-2.1-.4-4.1-1.1-6-.7-2-1.7-3.7-3-5.3s-2.8-3-4.6-4c-1.7-1.1-3.6-1.8-5.6-2.2s-4-.4-6 0c-1.9.4-3.8 1.1-5.6 2.1-1.7 1-3.2 2.3-4.5 3.8-1.3 1.6-2.3 3.3-3 5.2l-2.4 7c-9.6 27.4-18.3 53.4-26.2 76.4l-.6 1.8c-48.5 143.1-70.6 208.4-114.1 208.4h-2.9c-55.5 0-107.8-235.3-127.5-323.9-3.5-15.3-6.6-29.4-9.6-41.8h359.6q2.4 0 4.8-.3t4.8-.9q2.3-.6 4.6-1.5t4.4-2.1l.4-.2q.2-.1.4-.3.3-.1.5-.2t.4-.3l1.8-1.1.8-.6c.9-.6 1.7-1.3 2.5-1.9l.2-.2q4.5-3.9 7.8-8.7"
      />
    </svg>
  ),
);

AmplitudeSymbolIcon.displayName = 'AmplitudeSymbolIcon';
