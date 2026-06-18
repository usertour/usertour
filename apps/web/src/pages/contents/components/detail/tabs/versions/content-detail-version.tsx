import { VersionHistoryList } from './version-history-list';

export const ContentDetailVersion = () => {
  return (
    <div className="flex px-6 py-8 xl:px-8 justify-center">
      <div className="flex flex-col w-full max-w-screen-xl mx-auto gap-6">
        <VersionHistoryList />
      </div>
    </div>
  );
};

ContentDetailVersion.displayName = 'ContentDetailVersion';
