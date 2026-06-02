'use client';

import { ChevronLeftIcon } from '@radix-ui/react-icons';
import { Button, CardContent, CardFooter, CardHeader, CardTitle, ScrollArea } from '@usertour/ui';
import { EXTENSION_SIDEBAR_MAIN } from '@usertour/constants';
import { SpinnerIcon } from '@usertour/icons';
import { LauncherData } from '@usertour/types';
import { ContentAlignment } from '@/pages/contents/components/builder/components/content-alignment';
import { ContentWidth } from '@/pages/contents/components/builder/components/content-width';
import { useBuilderConfig } from '@/pages/contents/components/builder/core';
import { useLauncherEditor } from '@/pages/contents/components/builder/builders/launcher/use-launcher-editor';
import { SidebarContainer } from '@/pages/contents/components/builder/components/sidebar';
import { LauncherPosition } from '@/pages/contents/components/builder/builders/launcher/components/launcher-position';
import { LauncherSettings } from '@/pages/contents/components/builder/builders/launcher/components/launcher-settings';
import { useCallback, useLayoutEffect } from 'react';

const LauncherTooltipHeader = () => {
  const { backToLauncher, setLauncherTooltip } = useLauncherEditor();

  const handleBackToLauncher = () => {
    backToLauncher();
    setLauncherTooltip(undefined);
  };

  return (
    <CardHeader className="flex-none p-4 space-y-2">
      <CardTitle className="flex flex-row space-x-1 text-base items-center">
        <Button
          variant="link"
          size="icon"
          onClick={handleBackToLauncher}
          className="text-foreground w-6 h-8"
        >
          <ChevronLeftIcon className="h-6 w-6 " />
        </Button>
        <span className=" truncate ...">Tooltip settings</span>
      </CardTitle>
    </CardHeader>
  );
};

const LauncherTooltipBody = () => {
  const { launcherTooltip, setLauncherTooltip } = useLauncherEditor();
  const { zIndex } = useBuilderConfig();

  const updateLauncherTooltip = (updates: Partial<LauncherData['tooltip']>) => {
    setLauncherTooltip((prev) => {
      if (prev) {
        return {
          ...prev,
          ...updates,
        };
      }
    });
  };

  if (!launcherTooltip) {
    return null;
  }

  return (
    <CardContent className="bg-background-900 grow p-0 overflow-hidden">
      <ScrollArea className="h-full">
        <div className="flex-col space-y-3 p-4">
          <LauncherPosition
            type={launcherTooltip?.reference}
            onChange={(value) => updateLauncherTooltip({ reference: value })}
            zIndex={zIndex + EXTENSION_SIDEBAR_MAIN}
          />
          <ContentWidth
            type="tooltip"
            width={launcherTooltip?.width}
            defaultWidth={300}
            onChange={(value) => updateLauncherTooltip({ width: value })}
          />
          <ContentAlignment
            initialValue={launcherTooltip?.alignment}
            onChange={(value) => updateLauncherTooltip({ alignment: value })}
          />
          <LauncherSettings
            data={launcherTooltip?.settings}
            onChange={(value) => updateLauncherTooltip({ settings: value })}
          />
        </div>
      </ScrollArea>
    </CardContent>
  );
};

const LauncherTooltipFooter = () => {
  const {
    isLoading,
    updateData: updateLocalData,
    launcherTooltip,
    backToLauncher,
    setLauncherTooltip,
  } = useLauncherEditor();

  const saveTooltip = useCallback(() => {
    updateLocalData({ tooltip: launcherTooltip });
    backToLauncher();
    setLauncherTooltip(undefined);
  }, [launcherTooltip, updateLocalData, backToLauncher, setLauncherTooltip]);

  return (
    <CardFooter className="flex-none p-5">
      <Button className="w-full h-10" disabled={isLoading} onClick={saveTooltip}>
        {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
        Save
      </Button>
    </CardFooter>
  );
};

export const LauncherTooltip = () => {
  const { data, setLauncherTooltip } = useLauncherEditor();
  // Seed the tooltip draft from currentVersion on mount — see LauncherTarget.
  useLayoutEffect(() => {
    setLauncherTooltip(data?.tooltip);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <SidebarContainer>
      <LauncherTooltipHeader />
      <LauncherTooltipBody />
      <LauncherTooltipFooter />
    </SidebarContainer>
  );
};

LauncherTooltip.displayName = 'LauncherTooltip';
