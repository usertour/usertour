import {
  AttributeListProvider,
  ContentListProvider,
  ThemeListProvider,
  useThemeListContext,
} from '@usertour-ui/contexts';
import { useEffect } from 'react';
import {
  BuilderMode,
  BuilderProvider,
  ChecklistProvider,
  LauncherProvider,
  useBuilderContext,
} from '../contexts';
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
}

const WebBuilderCore = (props: WebBuilderProps) => {
  const { contentId, environmentId, versionId, projectId, envToken } = props;
  const { initContent } = useBuilderContext();

  useEffect(() => {
    const params = {
      contentId,
      environmentId,
      versionId,
      projectId,
      envToken,
    };
    initContent(params);
  }, []);

  return (
    <>
      <ThemeListProvider projectId={projectId}>
        <AttributeListProvider projectId={projectId}>
          <ContentListProvider
            environmentId={environmentId}
            key={'environmentId'}
            contentType={undefined}
            defaultQuery={{}}
            defaultPagination={{
              pageSize: 1000,
              pageIndex: 0,
            }}
          >
            <Container />
          </ContentListProvider>
        </AttributeListProvider>
      </ThemeListProvider>
    </>
  );
};

WebBuilderCore.displayName = 'WebBuilderCore';

export const WebBuilder = (props: WebBuilderProps) => {
  const { onSaved, usertourjsUrl } = props;
  return (
    <BuilderProvider isWebBuilder={true} onSaved={onSaved} usertourjsUrl={usertourjsUrl}>
      <LauncherProvider>
        <ChecklistProvider>
          <WebBuilderCore {...props} />
        </ChecklistProvider>
      </LauncherProvider>
    </BuilderProvider>
  );
};

WebBuilder.displayName = 'WebBuilder';
