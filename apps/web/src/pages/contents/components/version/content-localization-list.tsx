import { Card, Separator } from '@usertour/ui';

import { useContentDetailUI } from '@/contexts/content-detail-ui-context';
import { useContentDetail } from '@/hooks/use-content-detail';
import { useContentVersion } from '@/hooks/use-content-version';
import { ContentLocalizationTable } from './content-localization-table';

export const ContentLocalizationList = () => {
  const { contentId } = useContentDetailUI();
  const { content } = useContentDetail(contentId);
  const { version } = useContentVersion(content?.editedVersionId);

  if (!version?.id) {
    return <></>;
  }

  return (
    <div className="flex px-6 py-8 xl:px-8 space-x-8 justify-center">
      <Card className="flex flex-col p-4 space-y-6 w-full  max-w-screen-xl mx-auto">
        <h3 className="text-lg font-medium">Localization</h3>
        <Separator />
        <ContentLocalizationTable versionId={version.id} />
      </Card>
    </div>
  );
};

ContentLocalizationList.displayName = 'ContentLocalizationList';
