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
import { ElementPickerHost } from '@/components/element-picker-host';
import { WebBuilderLoading } from '@/pages/contents/components/builder/components/web-builder-loading';
import { useListsLoading } from '@/pages/contents/components/builder/hooks/use-lists-loading';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export interface WebBuilderProps {
  contentId: string;
  environmentId: string;
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

// Feeds the store-agnostic ElementPickerHost from the builder's zustand store.
// Separate component so it runs inside BuilderProvider (where the store lives);
// the host itself is shared with the content detail page, which feeds it from
// the Apollo-cached content instead.
function BuilderElementPickerHost({ children }: { children: ReactNode }) {
  const currentContent = useBuilderStore((state) => state.currentContent);
  const setCurrentContent = useBuilderStore((state) => state.setCurrentContent);
  return (
    <ElementPickerHost
      buildUrl={currentContent?.buildUrl}
      contentId={currentContent?.id}
      onBuildUrlSaved={(buildUrl) =>
        currentContent && setCurrentContent({ ...currentContent, buildUrl })
      }
    >
      {children}
    </ElementPickerHost>
  );
}

export const WebBuilder = (props: WebBuilderProps) => (
  <BuilderProvider {...props}>
    <BuilderElementPickerHost>
      <WebBuilderContent />
    </BuilderElementPickerHost>
  </BuilderProvider>
);

WebBuilder.displayName = 'WebBuilder';
