'use client';

import { ChevronLeftIcon } from '@radix-ui/react-icons';
import { Button } from '@usertour-ui/button';
import { CardContent, CardFooter, CardHeader, CardTitle } from '@usertour-ui/card';
import { EXTENSION_SIDEBAR_MAIN } from '@usertour-ui/constants';
import { SpinnerIcon } from '@usertour-ui/icons';
import { ScrollArea } from '@usertour-ui/scroll-area';
import { LauncherData } from '@usertour-ui/types';
import { ContentAlignment } from '../../components/content-alignment';
import { ContentWidth } from '../../components/content-width';
import { useLauncherContext } from '../../contexts/launcher-context';
import { SidebarContainer } from '../sidebar';
import { LauncherPosition } from './components/launcher-position';
import { LauncherSettings } from './components/launcher-settings';
import { useCallback } from 'react';

const LauncherTooltipHeader = () => {
  const { backToLauncher, setLauncherTooltip } = useLauncherContext();

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
  const { launcherTooltip, zIndex, setLauncherTooltip } = useLauncherContext();

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
  const { isLoading, updateLocalData, launcherTooltip, backToLauncher, setLauncherTooltip } =
    useLauncherContext();

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
  return (
    <SidebarContainer>
      <LauncherTooltipHeader />
      <LauncherTooltipBody />
      <LauncherTooltipFooter />
    </SidebarContainer>
  );
};

LauncherTooltip.displayName = 'LauncherTooltip';
