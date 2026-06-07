'use client';

import { Button, CardContent, CardFooter, CardHeader, CardTitle, ScrollArea } from '@usertour/ui';
import { RiArrowLeftSLine, SpinnerIcon } from '@usertour/icons';
import { useTranslation } from 'react-i18next';
import { ContentAlignment } from '@/pages/contents/components/builder/components/content-alignment';
import { useLauncherEditor } from '@/pages/contents/components/builder/launcher/use-launcher-editor';
import { FloatingSidebarPanel } from '@/pages/contents/components/builder/components/sidebar';
import { LauncherPlacement } from '@/pages/contents/components/builder/launcher/components/launcher-placement';
import { useCallback, useLayoutEffect } from 'react';

const LauncherTargetHeader = () => {
  const { backToLauncher, setLauncherTarget } = useLauncherEditor();
  const { t } = useTranslation();

  const handleBackToLauncher = () => {
    backToLauncher();
    setLauncherTarget(undefined);
  };

  return (
    <CardHeader className="flex-none border-b border-border/50 px-5 py-4">
      <CardTitle className="flex flex-row space-x-1 text-base font-semibold items-center pr-16">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBackToLauncher}
          className="mr-1.5 size-7 shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <RiArrowLeftSLine className="h-5 w-5" />
        </Button>
        <span className="truncate">{t('contentBuilder.launcher.targetSettings')}</span>
      </CardTitle>
    </CardHeader>
  );
};

const LauncherTargetBody = () => {
  const { launcherTarget, setLauncherTarget } = useLauncherEditor();

  if (!launcherTarget) {
    return null;
  }

  return (
    <CardContent className="grow overflow-hidden p-0">
      <ScrollArea className="h-full">
        <div className="flex-col space-y-3 p-4">
          <LauncherPlacement />
          <ContentAlignment
            initialValue={launcherTarget.alignment}
            onChange={(value) => {
              setLauncherTarget((prev) => {
                if (prev) {
                  return {
                    ...prev,
                    alignment: value,
                  };
                }
              });
            }}
          />
        </div>
      </ScrollArea>
    </CardContent>
  );
};

const LauncherTargetFooter = () => {
  const {
    isLoading,
    launcherTarget,
    backToLauncher,
    updateData: updateLocalData,
    setLauncherTarget,
  } = useLauncherEditor();
  const { t } = useTranslation();

  const handleSave = useCallback(() => {
    if (launcherTarget) {
      updateLocalData({ target: launcherTarget });
    }
    backToLauncher();
    setLauncherTarget(undefined);
  }, [launcherTarget, updateLocalData, backToLauncher, setLauncherTarget]);

  return (
    <CardFooter className="flex-none border-t border-border/50 p-4">
      <Button className="w-full h-10" disabled={isLoading} onClick={handleSave}>
        {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
        {t('contentBuilder.common.save')}
      </Button>
    </CardFooter>
  );
};

export const LauncherTarget = () => {
  const { data, setLauncherTarget } = useLauncherEditor();
  // Seed the target draft from currentVersion when the sub-view mounts, so
  // nav, deep-link and refresh all land on a populated panel. Layout effect
  // (before paint) because the body gates on `launcherTarget` — seeding
  // post-paint would flash a blank frame.
  useLayoutEffect(() => {
    setLauncherTarget(data.target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <FloatingSidebarPanel width={320}>
      <LauncherTargetHeader />
      <LauncherTargetBody />
      <LauncherTargetFooter />
    </FloatingSidebarPanel>
  );
};

LauncherTarget.displayName = 'LauncherTarget';
