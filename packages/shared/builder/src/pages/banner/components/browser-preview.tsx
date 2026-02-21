import type { ReactNode } from 'react';
import { RiArrowLeftSLine, RiArrowRightSLine } from '@usertour-packages/icons';

interface BrowserPreviewProps {
  children: ReactNode;
  width?: number;
}

export const PageContentMock = () => (
  <div className="space-y-6">
    {/* Header section */}
    <div className="space-y-3">
      <div className="h-8 bg-gray-700 rounded w-1/3" />
      <div className="space-y-2">
        <div className="h-4 bg-gray-300 rounded w-full" />
        <div className="h-4 bg-gray-300 rounded w-5/6" />
      </div>
    </div>

    {/* Button group */}
    <div className="flex gap-2">
      <div className="h-10 bg-blue-500 rounded w-24" />
      <div className="h-10 bg-gray-300 rounded w-24" />
      <div className="h-10 bg-gray-300 rounded w-24" />
    </div>

    {/* Content card */}
    <div className="space-y-4">
      <div className="h-6 bg-gray-600 rounded w-1/4" />
      <div className="space-y-2">
        <div className="h-4 bg-gray-300 rounded w-full" />
        <div className="h-4 bg-gray-300 rounded w-full" />
        <div className="h-4 bg-gray-300 rounded w-4/5" />
      </div>
    </div>

    {/* Image placeholder */}
    <div className="h-40 bg-gray-200 rounded border border-gray-300 flex items-center justify-center">
      <span className="text-gray-400 text-sm">Image</span>
    </div>

    {/* Another content section */}
    <div className="space-y-3">
      <div className="h-5 bg-gray-600 rounded w-1/3" />
      <div className="space-y-2">
        <div className="h-4 bg-gray-300 rounded w-full" />
        <div className="h-4 bg-gray-300 rounded w-full" />
        <div className="h-4 bg-gray-300 rounded w-3/5" />
      </div>
    </div>

    {/* Button */}
    <div className="h-10 bg-green-500 rounded w-32" />
  </div>
);

export const BrowserPreview = ({ children, width = 1200 }: BrowserPreviewProps) => {
  return (
    <div className="mx-auto pt-10" style={{ width: `${width}px` }}>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
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
        <div className="bg-white overflow-y-auto" style={{ height: '600px' }}>
          <div className="h-full flex flex-col">{children}</div>
        </div>
      </div>
    </div>
  );
};

BrowserPreview.displayName = 'BrowserPreview';
