import { useThemeList } from '../hooks/use-theme-list';
import { useEffect, useRef, useState } from 'react';
import { BuilderMode, useBuilderMethods, useBuilderStore } from '../contexts';
import { WebBuilderProvider, useWebBuilderProvider } from '../contexts/web-builder-provider';
import { WebBuilderLoading } from '../components/web-builder-loading';
import { BannerBuilder } from '../pages/banner';
import { ChecklistBuilder } from '../pages/checklist';
import { FlowBuilderDetail, FlowBuilderTrigger } from '../pages/flow';
import { LauncherBuilder } from '../pages/launcher';
import { ResourceCenterBuilder } from '../pages/resource-center';
import { BuilderSideBar } from '../pages/sidebar';

const Container = () => {
  const currentMode = useBuilderStore((state) => state.currentMode);
  const currentVersion = useBuilderStore((state) => state.currentVersion);
  const setCurrentTheme = useBuilderStore((state) => state.setCurrentTheme);
  const { themeList } = useThemeList();

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
  if (
    currentMode.mode === BuilderMode.RESOURCE_CENTER ||
    currentMode.mode === BuilderMode.RESOURCE_CENTER_BLOCK ||
    currentMode.mode === BuilderMode.RESOURCE_CENTER_TAB
  ) {
    return <ResourceCenterBuilder />;
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
  initialStepIndex?: number;
  shouldShowMadeWith?: boolean;
  onStepIndexChange?: (stepIndex: number | undefined) => void;
}

// Inner component that uses the provider context
function WebBuilderContent(props: WebBuilderProps) {
  const { contentId, environmentId, versionId, projectId, envToken, initialStepIndex } = props;
  const { initContent } = useBuilderMethods();
  const currentMode = useBuilderStore((state) => state.currentMode);
  const currentIndex = useBuilderStore((state) => state.currentIndex);
  const { isLoading: providerLoading } = useWebBuilderProvider();
  const [isInitializing, setIsInitializing] = useState(true);
  const onStepIndexChangeRef = useRef(props.onStepIndexChange);

  useEffect(() => {
    onStepIndexChangeRef.current = props.onStepIndexChange;
  }, [props.onStepIndexChange]);

  useEffect(() => {
    (async () => {
      const params = {
        contentId,
        environmentId,
        versionId,
        projectId,
        envToken,
        initialStepIndex,
      };
      await initContent(params);
      setIsInitializing(false);
    })();
  }, []);

  // Mirror the active step into the URL so deep-links and refresh keep the
  // user in the same panel. Skip while initializing to avoid clobbering the
  // initial ?step=N before initContent has had a chance to read it.
  useEffect(() => {
    if (isInitializing) {
      return;
    }
    const isStepMode =
      currentMode.mode === BuilderMode.FLOW_STEP_DETAIL ||
      currentMode.mode === BuilderMode.FLOW_STEP_TRIGGER;
    onStepIndexChangeRef.current?.(isStepMode ? currentIndex : undefined);
  }, [currentMode.mode, currentIndex, isInitializing]);

  // Show loading if any provider is loading or if we're still initializing
  if (providerLoading || isInitializing) {
    return <WebBuilderLoading message="Loading builder..." />;
  }

  return <Container />;
}

export const WebBuilder = (props: WebBuilderProps) => {
  const { shouldShowMadeWith, ...restProps } = props;
  return (
    <WebBuilderProvider {...restProps} shouldShowMadeWith={shouldShowMadeWith}>
      <WebBuilderContent {...restProps} />
    </WebBuilderProvider>
  );
};

WebBuilder.displayName = 'WebBuilder';
