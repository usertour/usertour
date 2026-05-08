import { RiArrowLeftSLine, RiArrowRightSLine } from '@usertour-packages/icons';
import { forwardRef, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  // Optional control slot rendered to the right of the URL bar (used to host
  // the widget switcher inside the frame's chrome).
  chromeAction?: ReactNode;
}

// Browser chrome wrapper for widget previews. Forwards a ref to the inner
// content area so widget previews can measure the actual viewport for
// positioning anchored elements (tooltips, etc).
//
// min-w-[640px] keeps modal / banner widgets renderable when sidebars are
// pushed wide; overflow gets clipped by the surrounding pane rather than
// letting the frame collapse below the widget's native size.
export const BrowserFrame = forwardRef<HTMLDivElement, Props>(({ children, chromeAction }, ref) => {
  return (
    <div className="flex h-full w-full min-w-[640px] max-w-[1200px] flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-md">
      {/* Window controls + nav arrows + URL bar */}
      <div className="flex h-11 flex-none items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <div className="h-3 w-3 rounded-full bg-yellow-500" />
          <div className="h-3 w-3 rounded-full bg-green-500" />
        </div>
        <div className="ml-4 flex flex-1 items-center gap-2">
          <div className="rounded p-1 text-gray-400">
            <RiArrowLeftSLine size={18} />
          </div>
          <div className="rounded p-1 text-gray-400">
            <RiArrowRightSLine size={18} />
          </div>
          <div className="flex-1 rounded bg-gray-100 px-3 py-1 text-center text-sm text-gray-600">
            example.com
          </div>
        </div>
        {chromeAction ? (
          <div className="ml-1 mr-1 flex items-center">{chromeAction}</div>
        ) : (
          <div className="w-12" />
        )}
      </div>
      {/* Inner viewport — widgets are rendered into this region. */}
      <div ref={ref} className="relative flex-1 overflow-hidden bg-white">
        {children}
      </div>
    </div>
  );
});
BrowserFrame.displayName = 'BrowserFrame';
