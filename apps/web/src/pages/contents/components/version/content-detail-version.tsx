import { VersionHistoryList } from './version-history-list';

export const ContentDetailVersion = () => {
  return (
    <div className="flex p-14 mt-12 justify-center">
      <div className="flex flex-col w-full max-w-screen-xl mx-auto gap-6">
        <VersionHistoryList />
      </div>
    </div>
  );
};

ContentDetailVersion.displayName = 'ContentDetailVersion';
