import { ContentDataType } from '@usertour/types';
import {
  BuilderProvider,
  useBuilderInit,
  useBuilderStore,
} from '@/pages/contents/components/builder/core';
import { BannerBuilder } from '@/pages/contents/components/builder/banner';
import { ChecklistBuilder } from '@/pages/contents/components/builder/checklist';
import { FlowBuilder } from '@/pages/contents/components/builder/flow';
import { LauncherBuilder } from '@/pages/contents/components/builder/launcher';
import { ResourceCenterBuilder } from '@/pages/contents/components/builder/resource-center';
import { ElementPickerHost } from '@/pages/contents/components/builder/components/element-picker-host';
import { WebBuilderLoading } from '@/pages/contents/components/builder/components/web-builder-loading';
import { useListsLoading } from '@/pages/contents/components/builder/hooks/use-lists-loading';
import { useTranslation } from 'react-i18next';

export interface WebBuilderProps {
  contentId: string;
  environmentId: string;
  versionId: string;
  projectId: string;
  onSaved: () => Promise<void>;
  shouldShowMadeWith?: boolean;
}

// The builder, inside BuilderProvider: drives init, observes the shared lists'
// loading, gates on `ready`, then dispatches on the content
// type to that type's view. Flow / Launcher / Checklist / ResourceCenter own
// their sub-views via a descendant <Routes> (under the builder route's `/*`);
// Banner is a single view with no sub-routes. The URL is the view's source of
// truth.
function WebBuilderContent() {
  const { ready } = useBuilderInit();
  const listsLoading = useListsLoading();
  const currentContent = useBuilderStore((state) => state.currentContent);
  const { t } = useTranslation();

  if (!ready || listsLoading) {
    return <WebBuilderLoading message={t('contentBuilder.loadingBuilder')} />;
  }

  switch (currentContent?.type) {
    case ContentDataType.FLOW:
      return <FlowBuilder />;
    case ContentDataType.LAUNCHER:
      return <LauncherBuilder />;
    case ContentDataType.CHECKLIST:
      return <ChecklistBuilder />;
    case ContentDataType.RESOURCE_CENTER:
      return <ResourceCenterBuilder />;
    case ContentDataType.BANNER:
      return <BannerBuilder />;
    default:
      return null;
  }
}

export const WebBuilder = (props: WebBuilderProps) => (
  <BuilderProvider {...props}>
    <ElementPickerHost>
      <WebBuilderContent />
    </ElementPickerHost>
  </BuilderProvider>
);

WebBuilder.displayName = 'WebBuilder';
