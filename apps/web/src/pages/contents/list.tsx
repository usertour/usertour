import { useAppContext } from '@/contexts/app-context';
import { ContentListProvider } from '@/contexts/content-list-context';
import { EventListProvider } from '@/contexts/event-list-context';
import { ThemeListProvider } from '@/contexts/theme-list-context';
import { ScrollArea } from '@usertour/scroll-area';
import { OpenInNewWindowIcon } from '@radix-ui/react-icons';
import { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { ContentDataType } from '@usertour/types';
import { ContentListLayout } from './components/list/content-list-layout';
import { ContentListSidebar } from './components/shared/content-list-sidebar';
import { ContentCreateForm } from './components/shared/content-create-form';

// Content type configuration interface
interface ContentConfig {
  title: string;
  description: ReactNode;
  emptyTitle: string;
  emptyDescription: string;
  createButtonText: string;
  createForm: (props: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSubmit?: (success: boolean) => void;
  }) => ReactNode;
  buttonId?: string;
}

// Reusable content description component with documentation link
interface ContentDescriptionProps {
  text: string;
  docUrl?: string;
  linkText?: string;
}

const ContentDescription = ({ text, docUrl, linkText }: ContentDescriptionProps) => (
  <>
    {text}
    {docUrl && linkText && (
      <>
        <br />
        <a href={docUrl} className="text-primary hover:underline" target="_blank" rel="noreferrer">
          <span>{linkText}</span>
          <OpenInNewWindowIcon className="size-3.5 inline ml-0.5 mb-0.5" />
        </a>
      </>
    )}
  </>
);

// Centralized configuration for all content types
const CONTENT_CONFIG: Record<string, ContentConfig> = {
  flows: {
    title: 'Flows',
    description: (
      <ContentDescription
        text="Step-by-step flows with tooltips and pop-up modals. Perfect for: product tours, user guides, and announcements."
        docUrl="https://docs.usertour.io/building-experiences/creating-your-first-flow/"
        linkText="Read more in our Creating your first flow guide"
      />
    ),
    emptyTitle: 'No flows added',
    emptyDescription: 'You have not added any flows. Add one below.',
    createButtonText: 'Create Flow',
    createForm: ({ open, onOpenChange, onSubmit }) => (
      <ContentCreateForm
        contentType={ContentDataType.FLOW}
        open={open}
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
      />
    ),
    buttonId: 'create-flow-button',
  },
  checklists: {
    title: 'Checklists',
    description: (
      <ContentDescription
        text="A checklist helps users feel accomplished, encourages them to engage more with your product, and guides them step-by-step through clear actions."
        docUrl="https://docs.usertour.io/how-to-guides/checklists"
        linkText="Read more in our Checklists guide"
      />
    ),
    emptyTitle: 'No checklists added',
    emptyDescription: 'You have not added any checklists. Add one below.',
    createButtonText: 'Create Checklist',
    createForm: ({ open, onOpenChange, onSubmit }) => (
      <ContentCreateForm
        contentType={ContentDataType.CHECKLIST}
        open={open}
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
      />
    ),
  },
  launchers: {
    title: 'Launchers',
    description: (
      <ContentDescription
        text="Launchers work well for: Highlighting key features with hotspots, Showing helpful tips with tooltips."
        docUrl="https://docs.usertour.io/how-to-guides/launchers"
        linkText="Read more in our Launchers guide"
      />
    ),
    emptyTitle: 'No launchers added',
    emptyDescription: 'You have not added any launchers. Add one below.',
    createButtonText: 'Create Launcher',
    createForm: ({ open, onOpenChange, onSubmit }) => (
      <ContentCreateForm
        contentType={ContentDataType.LAUNCHER}
        open={open}
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
      />
    ),
  },
  banners: {
    title: 'Banners',
    description: (
      <ContentDescription
        text="Banners are great for announcements, promotions, and important messages that need to be displayed prominently to users."
        docUrl="https://docs.usertour.io/how-to-guides/banners"
        linkText="Read more in our Banners guide"
      />
    ),
    emptyTitle: 'No banners added',
    emptyDescription: 'You have not added any banners. Add one below.',
    createButtonText: 'Create Banner',
    createForm: ({ open, onOpenChange, onSubmit }) => (
      <ContentCreateForm
        contentType={ContentDataType.BANNER}
        open={open}
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
      />
    ),
  },
  trackers: {
    title: 'Event trackers',
    description: (
      <ContentDescription
        text="Event trackers let you track business events when conditions are met."
        docUrl="https://docs.usertour.io/how-to-guides/event-trackers"
        linkText="Read more in our Event trackers guide"
      />
    ),
    emptyTitle: 'No event trackers added',
    emptyDescription: 'You have not added any event trackers. Add one below.',
    createButtonText: 'Create event tracker',
    createForm: ({ open, onOpenChange, onSubmit }) => (
      <ContentCreateForm
        contentType={ContentDataType.TRACKER}
        open={open}
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
      />
    ),
  },
  'resource-centers': {
    title: 'Resource Centers',
    description: (
      <ContentDescription
        text="A Resource Center provides a centralized hub for users to access help, guides, checklists, and more — all from a single launcher button."
        docUrl="https://docs.usertour.io/how-to-guides/resource-center"
        linkText="Read more in our Resource Center guide"
      />
    ),
    emptyTitle: 'No resource centers added',
    emptyDescription: 'You have not added any resource centers. Add one below.',
    createButtonText: 'Create Resource Center',
    createForm: ({ open, onOpenChange, onSubmit }) => (
      <ContentCreateForm
        contentType={ContentDataType.RESOURCE_CENTER}
        open={open}
        onOpenChange={onOpenChange}
        onSubmit={onSubmit}
      />
    ),
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
        <EventListProvider projectId={project?.id}>
          <ContentListSidebar title={config.title} />
          <ScrollArea className="h-full w-full">
            <div className="flex space-y-4 p-8 lg:pt-0 lg:pl-0">
              <ContentListLayout {...config} />
            </div>
          </ScrollArea>
        </EventListProvider>
      </ThemeListProvider>
    </ContentListProvider>
  );
};

ContentList.displayName = 'ContentList';
