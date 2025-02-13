import { useThemeListContext } from '@usertour-ui/contexts';
import { ContentEditorRoot } from '@usertour-ui/shared-editor';
import { Theme } from '@usertour-ui/types';
import { isEqual } from 'lodash';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { WebElementListener } from '../../../components/element-listener';
import { useBuilderContext, useLauncherContext } from '../../../contexts';
import { useAws } from '../../../hooks/use-aws';
import { LauncherContentMain } from './launcher-content';

export const LauncherBuilderEmbed = () => {
  const triggerRef = useRef<any>();
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [theme, setTheme] = useState<Theme | undefined>();
  const { zIndex, isWebBuilder, currentVersion } = useBuilderContext();
  const { themeList } = useThemeListContext();
  const { localData, updateLocalDataTooltip, launcherTarget, launcherTooltip } =
    useLauncherContext();
  const { upload } = useAws();

  useEffect(() => {
    if (!themeList?.length) return;

    const selectedTheme = currentVersion?.themeId
      ? themeList.find((item) => item.id === currentVersion.themeId)
      : themeList.find((item) => item.isDefault);

    if (selectedTheme) {
      setTheme(selectedTheme);
    }
  }, [themeList, currentVersion]);

  const handleCustomUploadRequest = useCallback((file: File) => upload(file), [upload]);

  const handleUpdateTooltipContent = useCallback(
    (content: ContentEditorRoot[]) => {
      if (!isEqual(content, localData?.tooltip.content)) {
        updateLocalDataTooltip({ content });
      }
    },
    [updateLocalDataTooltip, localData?.tooltip.content],
  );

  // Memoize merged data
  const mergedData = useMemo(() => {
    if (!localData) return null;

    return {
      ...localData,
      ...(launcherTarget && { target: launcherTarget }),
      ...(launcherTooltip && { tooltip: launcherTooltip }),
    };
  }, [localData, launcherTarget, launcherTooltip]);

  if (!mergedData) return null;

  return (
    <>
      {isWebBuilder && <WebElementListener ref={triggerRef} onMounted={() => setIsMounted(true)} />}
      {isMounted && theme && currentVersion && (
        <LauncherContentMain
          theme={theme}
          triggerRef={triggerRef}
          zIndex={zIndex}
          onCustomUploadRequest={handleCustomUploadRequest}
          data={mergedData}
          onValueChange={handleUpdateTooltipContent}
        />
      )}
    </>
  );
};

LauncherBuilderEmbed.displayName = 'LauncherBuilderEmbed';
