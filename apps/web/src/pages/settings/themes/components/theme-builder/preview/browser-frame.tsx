import { RiArrowLeftSLine, RiArrowRightSLine } from '@usertour/icons';
import { forwardRef, type ReactNode } from 'react';

export interface BrowserFrameProps {
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
export const BrowserFrame = forwardRef<HTMLDivElement, BrowserFrameProps>((props, ref) => {
  const { children, chromeAction } = props;
  return (
    <div className="flex h-full w-full min-w-[640px] max-w-[1200px] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-md">
      {/* Window controls + nav arrows + URL bar */}
      <div className="flex h-11 flex-none items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="h-3 w-3 rounded-full bg-red-500" />
          <div className="h-3 w-3 rounded-full bg-yellow-500" />
          <div className="h-3 w-3 rounded-full bg-green-500" />
        </div>
        <div className="ml-4 flex flex-1 items-center gap-2">
          <div className="rounded p-1 text-muted-foreground">
            <RiArrowLeftSLine size={18} />
          </div>
          <div className="rounded p-1 text-muted-foreground">
            <RiArrowRightSLine size={18} />
          </div>
          <div className="flex-1 rounded bg-muted px-3 py-1 text-center text-sm text-muted-foreground">
            example.com
          </div>
        </div>
        {chromeAction ? (
          <div className="ml-1 mr-1 flex items-center">{chromeAction}</div>
        ) : (
          <div className="w-12" />
        )}
      </div>
      {/* Inner viewport — the simulated web page widgets render onto. Uses the
          --preview-page canvas (white in light, neutral mid-grey in dark) so
          light widgets lift off it and modal dimmed overlays read as a grey
          wash rather than going to black. It simulates a page, so it stays a
          neutral canvas instead of following the dark app chrome. */}
      <div ref={ref} className="relative flex-1 overflow-hidden bg-preview-page">
        {children}
      </div>
    </div>
  );
});
BrowserFrame.displayName = 'BrowserFrame';
