import { ThemeDetailProvider, useThemeDetailContext } from '@/contexts/theme-detail-context';
import { Skeleton } from '@usertour-ui/skeleton';
import { useParams } from 'react-router-dom';
import { ThemeDetailContent } from './components/theme-detail-content';
import { ThemeDetailHeader } from './components/theme-detail-header';

// Complete skeleton for the entire theme detail page
const ThemeDetailSkeleton = () => (
  <div className="hidden flex-col md:flex">
    {/* Header skeleton */}
    <div className="border-b bg-white flex-col md:flex w-full fixed z-[100]">
      <div className="flex h-16 items-center px-4">
        <Skeleton className="h-6 w-6" /> {/* Back arrow */}
        <Skeleton className="h-5 w-32 ml-4" /> {/* Theme name */}
        <div className="ml-auto flex items-center space-x-4">
          <Skeleton className="h-9 w-16" /> {/* Save button */}
          <Skeleton className="h-9 w-9 rounded" /> {/* Actions button */}
        </div>
      </div>
    </div>

    {/* Content skeleton */}
    <div className="flex flex-row pt-24 px-8 h-[calc(100vh_-_196px)] bg-[#f3f4f6]">
      {/* Settings panel skeleton */}
      <div className="w-[350px] pr-8">
        <div className="shadow bg-white rounded-lg h-full flex flex-col py-4">
          {Array.from({ length: 13 }, (_, index) => (
            <div
              key={index}
              className={`border-b border-blue-100 last:border-none px-5 py-3 ${
                index === 0 ? 'rounded-t-lg' : ''
              } ${index === 12 ? 'rounded-b-lg' : ''}`}
            >
              <Skeleton className="h-2 w-32 mb-2" />
              <Skeleton className="h-2 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* Preview panel skeleton */}
      <div className="flex-1 w-full min-h-[600px] h-[calc(100vh_-_196px)]">
        <div className="bg-white rounded-lg shadow p-6 h-full pb-28">
          <div className="flex justify-between items-center mb-4">
            <Skeleton className="h-6 w-24" /> {/* Preview title */}
            <Skeleton className="h-8 w-32" /> {/* Dropdown */}
          </div>
          <div className="flex justify-center items-center h-full ">
            <Skeleton className="h-64 w-96 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Inner component that uses the context
const ThemeDetailInner = () => {
  const { loading } = useThemeDetailContext();

  if (loading) {
    return <ThemeDetailSkeleton />;
  }

  return (
    <div className="hidden flex-col md:flex">
      <ThemeDetailHeader />
      <ThemeDetailContent />
    </div>
  );
};

export const SettingsThemeDetail = () => {
  const { themeId = '' } = useParams();

  return (
    <ThemeDetailProvider themeId={themeId}>
      <ThemeDetailInner />
    </ThemeDetailProvider>
  );
};

SettingsThemeDetail.displayName = 'SettingsThemeDetail';
