import { useAppContext } from '@/contexts/app-context';
import { ScrollRootProvider } from '@/contexts/scroll-root-context';
import { NotFound } from '@/routes/not-found';
import { ScrollArea } from '@usertour/ui';
import { RiExternalLinkLine } from '@usertour/icons';
import { ReactNode, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useParams } from 'react-router-dom';
import { ContentDataType } from '@usertour/types';
import { ContentListLayout } from './components/list/content-list-layout';
import { ContentListSidebar } from './components/shared/content-list-sidebar';
import { ContentCreateForm } from './components/shared/content-create-form';

// Per-content-type i18n key for the localised lowercased noun used in
// `contents.list.newButton` (and by the dialog copy in ContentCreateForm).
const CONTENT_TYPE_I18N_KEY: Record<ContentDataType, string> = {
  [ContentDataType.FLOW]: 'contents.types.flow',
  [ContentDataType.CHECKLIST]: 'contents.types.checklist',
  [ContentDataType.LAUNCHER]: 'contents.types.launcher',
  [ContentDataType.BANNER]: 'contents.types.banner',
  [ContentDataType.TRACKER]: 'contents.types.tracker',
  [ContentDataType.RESOURCE_CENTER]: 'contents.types.resourceCenter',
};

// Content type configuration interface
interface ContentConfig {
  /** Drives the localised `contents.list.newButton` label at render. */
  dataType: ContentDataType;
  title: string;
  description: ReactNode;
  emptyTitle: string;
  emptyDescription: string;
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
          <RiExternalLinkLine className="size-3.5 inline ml-0.5 mb-0.5" />
        </a>
      </>
    )}
  </>
);

// Centralized configuration for all content types. Built per-render from the
// translator so every label is localised; doc URLs stay as literal constants.
const buildContentConfig = (t: TFunction): Record<string, ContentConfig> => {
  const config: Record<string, ContentConfig> = {
    flows: {
      dataType: ContentDataType.FLOW,
      title: t('contents.list.flows.title'),
      description: (
        <ContentDescription
          text={t('contents.list.flows.text')}
          docUrl="https://docs.usertour.io/building-experiences/creating-your-first-flow/"
          linkText={t('contents.list.flows.link')}
        />
      ),
      emptyTitle: t('contents.list.flows.emptyTitle'),
      emptyDescription: t('contents.list.flows.emptyDescription'),
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
      dataType: ContentDataType.CHECKLIST,
      title: t('contents.list.checklists.title'),
      description: (
        <ContentDescription
          text={t('contents.list.checklists.text')}
          docUrl="https://docs.usertour.io/how-to-guides/checklists"
          linkText={t('contents.list.checklists.link')}
        />
      ),
      emptyTitle: t('contents.list.checklists.emptyTitle'),
      emptyDescription: t('contents.list.checklists.emptyDescription'),
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
      dataType: ContentDataType.LAUNCHER,
      title: t('contents.list.launchers.title'),
      description: (
        <ContentDescription
          text={t('contents.list.launchers.text')}
          docUrl="https://docs.usertour.io/how-to-guides/launchers"
          linkText={t('contents.list.launchers.link')}
        />
      ),
      emptyTitle: t('contents.list.launchers.emptyTitle'),
      emptyDescription: t('contents.list.launchers.emptyDescription'),
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
      dataType: ContentDataType.BANNER,
      title: t('contents.list.banners.title'),
      description: (
        <ContentDescription
          text={t('contents.list.banners.text')}
          docUrl="https://docs.usertour.io/how-to-guides/banners"
          linkText={t('contents.list.banners.link')}
        />
      ),
      emptyTitle: t('contents.list.banners.emptyTitle'),
      emptyDescription: t('contents.list.banners.emptyDescription'),
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
      dataType: ContentDataType.TRACKER,
      title: t('contents.list.trackers.title'),
      description: (
        <ContentDescription
          text={t('contents.list.trackers.text')}
          docUrl="https://docs.usertour.io/how-to-guides/event-trackers"
          linkText={t('contents.list.trackers.link')}
        />
      ),
      emptyTitle: t('contents.list.trackers.emptyTitle'),
      emptyDescription: t('contents.list.trackers.emptyDescription'),
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
      dataType: ContentDataType.RESOURCE_CENTER,
      title: t('contents.list.resourceCenters.title'),
      description: (
        <ContentDescription
          text={t('contents.list.resourceCenters.text')}
          docUrl="https://docs.usertour.io/how-to-guides/resource-center"
          linkText={t('contents.list.resourceCenters.link')}
        />
      ),
      emptyTitle: t('contents.list.resourceCenters.emptyTitle'),
      emptyDescription: t('contents.list.resourceCenters.emptyDescription'),
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
  config.content = config.flows;
  return config;
};

export const ContentList = () => {
  const { contentType } = useParams();
  const { environment, project } = useAppContext();
  const { t } = useTranslation();
  const contentConfig = useMemo(() => buildContentConfig(t), [t]);

  // Hold the ScrollArea Viewport DOM node so the DataTable can register
  // it as the IntersectionObserver root for infinite scroll.
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);

  // AppContext is hydrating; brief null beats a transient loading flash.
  if (!environment || !project) {
    return null;
  }

  // Missing path param (shouldn't happen if the route matched) or
  // unknown slug in the URL — render the standard 404.
  if (!contentType) {
    return <NotFound />;
  }
  const config = contentConfig[contentType];
  if (!config) {
    return <NotFound />;
  }

  // Trigger button: `New {{type}}` per the convention shared with
  // ContentCreateForm's dialog title.
  const createButtonText = t('contents.list.newButton', {
    type: t(CONTENT_TYPE_I18N_KEY[config.dataType]),
  });

  return (
    <>
      <ContentListSidebar title={config.title} />
      <ScrollArea className="h-full w-full" viewportRef={setScrollRoot}>
        <ScrollRootProvider value={scrollRoot}>
          <div className="flex space-y-4 p-8 lg:pt-0 lg:pl-0">
            <ContentListLayout
              {...config}
              contentType={contentType}
              createButtonText={createButtonText}
            />
          </div>
        </ScrollRootProvider>
      </ScrollArea>
    </>
  );
};

ContentList.displayName = 'ContentList';
