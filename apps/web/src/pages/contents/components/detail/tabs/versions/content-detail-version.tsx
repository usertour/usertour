import { EnvironmentsCard } from './environments-card';
import { PublishHistoryList } from './publish-history-list';
import { VersionHistoryList } from './version-history-list';

export const ContentDetailVersion = () => {
  return (
    <div className="flex px-6 py-8 xl:px-8 justify-center">
      {/* Side by side on wide screens (each column keeps its own height), stacked below.
          Right column: current per-environment state on top, its history below. */}
      <div className="grid w-full max-w-screen-xl mx-auto gap-6 grid-cols-1 xl:grid-cols-2 items-start">
        <VersionHistoryList />
        <div className="flex flex-col gap-6">
          <EnvironmentsCard />
          <PublishHistoryList />
        </div>
      </div>
    </div>
  );
};

ContentDetailVersion.displayName = 'ContentDetailVersion';
