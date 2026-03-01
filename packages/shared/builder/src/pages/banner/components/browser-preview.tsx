import type { ReactNode } from 'react';
import { RiArrowLeftSLine, RiArrowRightSLine } from '@usertour-packages/icons';

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
      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200 h-full flex flex-col">
        {/* macOS Style Window Controls */}
        <div className="px-4 py-3 flex items-center justify-between gap-3 h-11 border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>

          <div className="flex-1 flex items-center gap-2 ml-4">
            <div className="p-1 rounded text-gray-400">
              <RiArrowLeftSLine size={18} />
            </div>
            <div className="p-1 rounded text-gray-400">
              <RiArrowRightSLine size={18} />
            </div>
            <div className="flex-1 bg-gray-100 rounded px-3 py-1 text-sm text-gray-600 text-center">
              example.com
            </div>
          </div>

          <div className="w-12" />
        </div>

        {/* Browser Content Area */}
        <div className="bg-white overflow-y-auto flex-1 min-h-0">
          <div className="h-full flex flex-col">{children}</div>
        </div>
      </div>
    </div>
  );
};

BrowserPreview.displayName = 'BrowserPreview';
