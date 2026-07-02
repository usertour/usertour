import { PublishHistoryList } from './publish-history-list';
import { VersionHistoryList } from './version-history-list';

export const ContentDetailVersion = () => {
  return (
    <div className="flex px-6 py-8 xl:px-8 justify-center">
      {/* Side by side on wide screens (each card keeps its own height), stacked below. */}
      <div className="grid w-full max-w-screen-xl mx-auto gap-6 grid-cols-1 xl:grid-cols-2 items-start">
        <VersionHistoryList />
        <PublishHistoryList />
      </div>
    </div>
  );
};

ContentDetailVersion.displayName = 'ContentDetailVersion';
