import { useThemeListContext } from '@usertour-ui/contexts';
import { useEffect, useState } from 'react';
import { BuilderMode, useBuilderContext } from '../contexts';
import { WebBuilderProvider, useWebBuilderProvider } from '../contexts/web-builder-provider';
import { WebBuilderLoading } from '../components/web-builder-loading';
import { BannerBuilder } from '../pages/banner';
import { ChecklistBuilder } from '../pages/checklist';
import { FlowBuilderDetail, FlowBuilderTrigger } from '../pages/flow';
import { LauncherBuilder } from '../pages/launcher';
import { BuilderSideBar } from '../pages/sidebar';

const Container = () => {
  const { currentMode, currentVersion, setCurrentTheme } = useBuilderContext();
  const { themeList } = useThemeListContext();

  useEffect(() => {
    if (!currentVersion) {
      return;
    }
    if (themeList) {
      const theme = themeList.find((theme) => theme.id === currentVersion.themeId);
      if (theme) {
        setCurrentTheme(theme);
      }
    }
  }, [themeList, currentVersion]);

  if (currentMode.mode === BuilderMode.FLOW_STEP_DETAIL) {
    return <FlowBuilderDetail />;
  }
  if (currentMode.mode === BuilderMode.FLOW_STEP_TRIGGER) {
    return <FlowBuilderTrigger />;
  }
  if (
    currentMode.mode === BuilderMode.LAUNCHER ||
    currentMode.mode === BuilderMode.LAUNCHER_TARGET ||
    currentMode.mode === BuilderMode.LAUNCHER_TOOLTIP
  ) {
    return <LauncherBuilder />;
  }
  if (
    currentMode.mode === BuilderMode.CHECKLIST ||
    currentMode.mode === BuilderMode.CHECKLIST_ITEM
  ) {
    return <ChecklistBuilder />;
  }
  if (currentMode.mode === BuilderMode.BANNER) {
    return <BannerBuilder />;
  }
  if (currentMode.mode === BuilderMode.FLOW) {
    return <BuilderSideBar />;
  }
  return <></>;
};

export interface WebBuilderProps {
  contentId: string;
  environmentId: string;
  versionId: string;
  projectId: string;
  envToken: string;
  usertourjsUrl?: string;
  onSaved: () => Promise<void>;
  isLoading?: boolean;
}

// Inner component that uses the provider context
function WebBuilderContent(props: WebBuilderProps) {
  const { contentId, environmentId, versionId, projectId, envToken } = props;
  const { initContent } = useBuilderContext();
  const { isLoading: providerLoading } = useWebBuilderProvider();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    (async () => {
      const params = {
        contentId,
        environmentId,
        versionId,
        projectId,
        envToken,
      };
      await initContent(params);
      setIsInitializing(false);
    })();
  }, []);

  // Show loading if any provider is loading or if we're still initializing
  if (providerLoading || isInitializing) {
    return <WebBuilderLoading message="Loading builder..." />;
  }

  return <Container />;
}

export const WebBuilder = (props: WebBuilderProps) => {
  return (
    <WebBuilderProvider {...props}>
      <WebBuilderContent {...props} />
    </WebBuilderProvider>
  );
};

WebBuilder.displayName = 'WebBuilder';
