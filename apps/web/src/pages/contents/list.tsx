import { useAppContext } from '@/contexts/app-context';
import { ContentListProvider } from '@/contexts/content-list-context';
import { ThemeListProvider } from '@/contexts/theme-list-context';
import { ScrollArea } from '@usertour-ui/scroll-area';
import { useParams } from 'react-router-dom';
import { BannerListContent } from './components/list/banner-list';
import { ChecklistListContent } from './components/list/checklist-list';
import { FlowListContent } from './components/list/flow-list';
import { LauncherListContent } from './components/list/launcher-list';
import { ContentListSidebar } from './components/shared/content-list-sidebar';

export const ContentList = () => {
  const { contentType } = useParams();
  const { environment, project } = useAppContext();

  if (!contentType || !environment || !project) {
    return <></>;
  }

  return (
    <>
      <ContentListProvider
        environmentId={environment?.id}
        key={'environmentId'}
        contentType={contentType}
      >
        <ThemeListProvider projectId={project?.id}>
          <ContentListSidebar />

          <ScrollArea className="h-full w-full ">
            <div className="flex space-y-4 p-8 lg:pt-0 lg:pl-0 ">
              {(contentType === 'flows' || contentType === 'content') && <FlowListContent />}
              {contentType === 'launchers' && <LauncherListContent />}
              {contentType === 'banners' && <BannerListContent />}
              {contentType === 'checklists' && <ChecklistListContent />}
            </div>
          </ScrollArea>
        </ThemeListProvider>
      </ContentListProvider>
    </>
  );
};

ContentList.displayName = 'ContentList';
