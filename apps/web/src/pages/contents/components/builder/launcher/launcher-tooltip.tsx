'use client';
import { Button, CardContent, CardFooter, CardHeader, CardTitle, ScrollArea } from '@usertour/ui';
import { RiArrowLeftSLine, SpinnerIcon } from '@usertour/icons';
import { LauncherData } from '@usertour/types';
import { useTranslation } from 'react-i18next';
import { ContentAlignment } from '@/pages/contents/components/builder/components/content-alignment';
import { ContentWidth } from '@/pages/contents/components/builder/components/content-width';
import { useLauncherEditor } from '@/pages/contents/components/builder/launcher/use-launcher-editor';
import { FloatingSidebarPanel } from '@/pages/contents/components/builder/components/sidebar';
import { LauncherPosition } from '@/pages/contents/components/builder/launcher/components/launcher-position';
import { LauncherSettings } from '@/pages/contents/components/builder/launcher/components/launcher-settings';
import { useCallback, useLayoutEffect } from 'react';

const LauncherTooltipHeader = () => {
  const { backToLauncher, setLauncherTooltip } = useLauncherEditor();
  const { t } = useTranslation();

  const handleBackToLauncher = () => {
    backToLauncher();
    setLauncherTooltip(undefined);
  };

  return (
    <CardHeader className="flex-none border-b border-border/50 px-5 py-4">
      <CardTitle className="flex flex-row space-x-1 text-base font-medium items-center pr-16">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBackToLauncher}
          className="mr-1.5 size-7 shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <RiArrowLeftSLine className="h-5 w-5" />
        </Button>
        <span className="truncate">{t('contentBuilder.launcher.tooltipSettings')}</span>
      </CardTitle>
    </CardHeader>
  );
};

const LauncherTooltipBody = () => {
  const { launcherTooltip, setLauncherTooltip } = useLauncherEditor();

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
    <CardContent className="grow overflow-hidden p-0">
      <ScrollArea className="h-full">
        <div className="flex-col space-y-3 p-4">
          <LauncherPosition
            type={launcherTooltip.reference}
            onChange={(value) => updateLauncherTooltip({ reference: value })}
          />
          <ContentWidth
            type="tooltip"
            width={launcherTooltip.width}
            defaultWidth={300}
            onChange={(value) => updateLauncherTooltip({ width: value })}
          />
          <ContentAlignment
            initialValue={launcherTooltip.alignment}
            onChange={(value) => updateLauncherTooltip({ alignment: value })}
          />
          <LauncherSettings
            data={launcherTooltip.settings}
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
  const { t } = useTranslation();

  const saveTooltip = useCallback(() => {
    updateLocalData({ tooltip: launcherTooltip });
    backToLauncher();
    setLauncherTooltip(undefined);
  }, [launcherTooltip, updateLocalData, backToLauncher, setLauncherTooltip]);

  return (
    <CardFooter className="flex-none border-t border-border/50 p-4">
      <Button className="w-full h-10" disabled={isLoading} onClick={saveTooltip}>
        {isLoading && <SpinnerIcon className="mr-2 h-4 w-4 animate-spin" />}
        {t('contentBuilder.common.save')}
      </Button>
    </CardFooter>
  );
};

export const LauncherTooltip = () => {
  const { data, setLauncherTooltip } = useLauncherEditor();
  // Seed the tooltip draft from currentVersion on mount — see LauncherTarget.
  useLayoutEffect(() => {
    setLauncherTooltip(data.tooltip);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <FloatingSidebarPanel width={320}>
      <LauncherTooltipHeader />
      <LauncherTooltipBody />
      <LauncherTooltipFooter />
    </FloatingSidebarPanel>
  );
};

LauncherTooltip.displayName = 'LauncherTooltip';
