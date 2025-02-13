import { Separator } from '@usertour-ui/separator';

import { useAppContext } from '@/contexts/app-context';
import { ContentLocalizationListProvider } from '@/contexts/content-localization-list-context';
import { useContentVersionContext } from '@/contexts/content-version-context';
import { LocalizationListProvider } from '@/contexts/localization-list-context';
import { ContentLocalizationTable } from './content-localization-table';

export const ContentLocalizationList = () => {
  const { version } = useContentVersionContext();
  const { project } = useAppContext();

  if (!version?.id) {
    return <></>;
  }

  return (
    <>
      <LocalizationListProvider projectId={project?.id}>
        <ContentLocalizationListProvider versionId={version?.id}>
          <div className="flex p-14 mt-12 space-x-8 justify-center ">
            <div className="flex flex-col p-4 shadow bg-white rounded-lg space-y-6 w-full  max-w-screen-xl mx-auto">
              <h3 className="text-lg font-medium">Localization</h3>
              <Separator />
              <ContentLocalizationTable />
            </div>
          </div>
        </ContentLocalizationListProvider>
      </LocalizationListProvider>
    </>
  );
};

ContentLocalizationList.displayName = 'ContentLocalizationList';
