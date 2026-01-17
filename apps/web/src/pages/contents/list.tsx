import { useAppContext } from '@/contexts/app-context';
import { ContentListProvider } from '@/contexts/content-list-context';
import { ThemeListProvider } from '@/contexts/theme-list-context';
import { ScrollArea } from '@usertour-packages/scroll-area';
import { OpenInNewWindowIcon } from '@radix-ui/react-icons';
import { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { ContentListLayout } from './components/list/content-list-layout';
import { ContentListSidebar } from './components/shared/content-list-sidebar';
import { BannerCreateForm } from './components/shared/banner-create-form';
import { ChecklistCreateForm } from './components/shared/checklist-create-form';
import { ContentCreateForm } from './components/shared/content-create-form';
import { LauncherCreateForm } from './components/shared/launcher-create-form';

// Content type configuration interface
interface ContentConfig {
  title: string;
  description: ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  createButtonText: string;
  createForm: (props: { isOpen: boolean; onClose: () => void }) => ReactNode;
  buttonId?: string;
}

// Flow description with documentation link
const FlowDescription = () => (
  <>
    Step-by-step flows with tooltips and pop-up modals. Perfect for: product tours, user guides, and
    announcements. <br />
    <a
      href="https://docs.usertour.io/building-experiences/creating-your-first-flow/"
      className="text-primary"
      target="_blank"
      rel="noreferrer"
    >
      <span>Read more in our Creating your first flow guide</span>
      <OpenInNewWindowIcon className="size-3.5 inline ml-0.5 mb-0.5" />
    </a>
  </>
);

// Centralized configuration for all content types
const CONTENT_CONFIG: Record<string, ContentConfig> = {
  flows: {
    title: 'Flows',
    description: <FlowDescription />,
    emptyTitle: 'No flows added',
    emptyDescription: 'You have not added any flows. Add one below.',
    createButtonText: 'Create Flow',
    createForm: ({ isOpen, onClose }) => <ContentCreateForm isOpen={isOpen} onClose={onClose} />,
    buttonId: 'create-flow-button',
  },
  checklists: {
    title: 'Checklists',
    description:
      'A checklist helps users feel accomplished, encourages them to engage more with your product, and guides them step-by-step through clear actions.',
    emptyTitle: 'No checklists added',
    emptyDescription: 'You have not added any checklists. Add one below.',
    createButtonText: 'Create Checklist',
    createForm: ({ isOpen, onClose }) => <ChecklistCreateForm isOpen={isOpen} onClose={onClose} />,
  },
  launchers: {
    title: 'Launchers',
    description:
      'Launchers work well for: Highlighting key features with hotspots, Showing helpful tips with tooltips.',
    emptyTitle: 'No launchers added',
    emptyDescription: 'You have not added any launchers. Add one below.',
    createButtonText: 'Create Launcher',
    createForm: ({ isOpen, onClose }) => <LauncherCreateForm isOpen={isOpen} onClose={onClose} />,
  },
  banners: {
    title: 'Banners',
    description:
      'Banners are great for announcements, promotions, and important messages that need to be displayed prominently to users.',
    emptyTitle: 'No banners added',
    emptyDescription: 'You have not added any banners. Add one below.',
    createButtonText: 'Create Banner',
    createForm: ({ isOpen, onClose }) => <BannerCreateForm isOpen={isOpen} onClose={onClose} />,
  },
};

// Support 'content' as alias for 'flows'
CONTENT_CONFIG.content = CONTENT_CONFIG.flows;

export const ContentList = () => {
  const { contentType } = useParams();
  const { environment, project } = useAppContext();

  if (!contentType || !environment || !project) {
    return null;
  }

  const config = CONTENT_CONFIG[contentType];
  if (!config) {
    return null;
  }

  return (
    <ContentListProvider
      environmentId={environment?.id}
      key="environmentId"
      contentType={contentType}
    >
      <ThemeListProvider projectId={project?.id}>
        <ContentListSidebar />
        <ScrollArea className="h-full w-full">
          <div className="flex space-y-4 p-8 lg:pt-0 lg:pl-0">
            <ContentListLayout {...config} />
          </div>
        </ScrollArea>
      </ThemeListProvider>
    </ContentListProvider>
  );
};

ContentList.displayName = 'ContentList';
