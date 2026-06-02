import { useThemeList } from '@/hooks/use-theme-list';
import { ContentEditorRoot } from '@usertour/editor';
import { Theme } from '@usertour/types';
import { isEqual } from 'lodash';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBuilderConfig, useBuilderStore } from '@/pages/contents/components/builder/core';
import { useAws } from '@usertour/hooks';
import { useLauncherEditor } from '@/pages/contents/components/builder/launcher/use-launcher-editor';
import { LauncherContentMain } from '@/pages/contents/components/builder/launcher/components/launcher-content';
import { PlusIcon } from '@usertour/icons';
import { cn } from '@usertour/tailwind';

const centerClasses =
  'w-auto h-6 left-[50%] top-[50%] z-50 grid translate-x-[-50%] translate-y-[-50%]';

export const LauncherBuilderEmbed = () => {
  const triggerRef = useRef<any>();
  const [theme, setTheme] = useState<Theme | undefined>();
  const { zIndex } = useBuilderConfig();
  const currentVersion = useBuilderStore((state) => state.currentVersion);
  const { themeList } = useThemeList();
  const {
    data: localData,
    updateDataTooltip: updateLocalDataTooltip,
    launcherTarget,
    launcherTooltip,
  } = useLauncherEditor();
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

  if (!mergedData || !theme || !currentVersion) return null;

  return (
    <>
      <PlusIcon width={24} height={24} ref={triggerRef} className={cn('fixed', centerClasses)} />
      <LauncherContentMain
        theme={theme}
        triggerRef={triggerRef}
        zIndex={zIndex}
        onCustomUploadRequest={handleCustomUploadRequest}
        data={mergedData}
        onValueChange={handleUpdateTooltipContent}
      />
    </>
  );
};

LauncherBuilderEmbed.displayName = 'LauncherBuilderEmbed';
