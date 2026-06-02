import { ContentEditorRoot } from '@usertour/editor';
import { isEqual } from 'lodash';
import { useCallback, useMemo, useRef } from 'react';
import { useBuilderConfig, useBuilderStore } from '@/pages/contents/components/builder/core';
import { useCurrentTheme } from '@/pages/contents/components/builder/hooks/use-current-theme';
import { useAws } from '@usertour/hooks';
import { useLauncherEditor } from '@/pages/contents/components/builder/launcher/use-launcher-editor';
import { LauncherContentMain } from '@/pages/contents/components/builder/launcher/components/launcher-content';
import { PlusIcon } from '@usertour/icons';
import { cn } from '@usertour/tailwind';

const centerClasses =
  'w-auto h-6 left-[50%] top-[50%] z-50 grid translate-x-[-50%] translate-y-[-50%]';

export const LauncherBuilderEmbed = () => {
  const triggerRef = useRef<any>();
  const { zIndex } = useBuilderConfig();
  const currentVersion = useBuilderStore((state) => state.currentVersion);
  const theme = useCurrentTheme({ fallbackToDefault: true });
  const {
    data: localData,
    updateDataTooltip: updateLocalDataTooltip,
    launcherTarget,
    launcherTooltip,
  } = useLauncherEditor();
  const { upload } = useAws();

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
        onCustomUploadRequest={upload}
        data={mergedData}
        onValueChange={handleUpdateTooltipContent}
      />
    </>
  );
};

LauncherBuilderEmbed.displayName = 'LauncherBuilderEmbed';
