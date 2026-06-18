import type { ReactNode } from 'react';
import { RiArrowLeftSLine, RiArrowRightSLine } from '@usertour/icons';

interface BrowserPreviewProps {
  children: ReactNode;
  width?: number;
}

export const BrowserPreview = ({ children, width = 1200 }: BrowserPreviewProps) => {
  return (
    <div
      className="mx-auto py-8"
      style={{
        width: `${width}px`,
        maxWidth: 'calc(100vw - 32px)',
        height: '100dvh',
        minHeight: '720px',
      }}
    >
      <div className="bg-white dark:bg-card rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-border h-full flex flex-col">
        {/* macOS Style Window Controls */}
        <div className="px-4 py-3 flex items-center justify-between gap-3 h-11 border-b border-gray-200 dark:border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>

          <div className="flex-1 flex items-center gap-2 ml-4">
            <div className="p-1 rounded text-gray-400 dark:text-muted-foreground">
              <RiArrowLeftSLine size={18} />
            </div>
            <div className="p-1 rounded text-gray-400 dark:text-muted-foreground">
              <RiArrowRightSLine size={18} />
            </div>
            <div className="flex-1 bg-gray-100 dark:bg-muted rounded px-3 py-1 text-sm text-gray-600 dark:text-muted-foreground text-center">
              example.com
            </div>
          </div>

          <div className="w-12" />
        </div>

        {/* Browser Content Area — white page in light; in dark it shares the
            frame's card surface (no separate canvas tint) so the simulated
            browser reads as one clean dark surface, chrome and viewport split
            only by the header border. */}
        <div className="bg-white dark:bg-card overflow-y-auto flex-1 min-h-0">
          <div className="h-full flex flex-col">{children}</div>
        </div>
      </div>
    </div>
  );
};

BrowserPreview.displayName = 'BrowserPreview';
