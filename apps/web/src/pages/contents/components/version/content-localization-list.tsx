import { Card, Separator } from '@usertour/ui';

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
          <div className="flex px-6 py-8 xl:px-8 space-x-8 justify-center">
            <Card className="flex flex-col p-4 space-y-6 w-full  max-w-screen-xl mx-auto">
              <h3 className="text-lg font-medium">Localization</h3>
              <Separator />
              <ContentLocalizationTable />
            </Card>
          </div>
        </ContentLocalizationListProvider>
      </LocalizationListProvider>
    </>
  );
};

ContentLocalizationList.displayName = 'ContentLocalizationList';
