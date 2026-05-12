'use client';

import { CardContent, CardFooter, CardHeader, CardTitle } from '@usertour-packages/card';
import { ScrollArea } from '@usertour-packages/scroll-area';
import { useBuilderContext, useLauncherContext } from '../../contexts';
import { useActionsSaveGate } from '../../hooks/use-actions-save-gate';
import { SidebarContainer } from '../sidebar';
import { SidebarFooter } from '../sidebar/sidebar-footer';
import { SidebarHeader } from '../sidebar/sidebar-header';
import { SidebarTheme } from '../sidebar/sidebar-theme';
import { LauncherBehavior } from './components/launcher-behavior';
import { LauncherTargetPreview } from './components/launcher-target-preview';
import { LauncherType } from './components/launcher-type';
import { LauncherZIndex } from './components/launcher-zindex';

const LauncherCoreBody = () => {
  return (
    <CardContent className="bg-background-900 grow p-0 overflow-hidden">
      <ScrollArea className="h-full ">
        <div className="flex-col space-y-3 p-4">
          <SidebarTheme />
          <LauncherType />
          <LauncherZIndex />
          <LauncherTargetPreview />
          <LauncherBehavior />
        </div>
      </ScrollArea>
    </CardContent>
  );
};

const LauncherCoreHeader = () => {
  const { currentContent } = useBuilderContext();
  return (
    <CardHeader className="flex-none p-4 space-y-3">
      <CardTitle className="flex h-8	">
        <SidebarHeader title={currentContent?.name ?? ''} />
      </CardTitle>
    </CardHeader>
  );
};

const LauncherCoreFooter = () => {
  const { isLoading, onSaved } = useBuilderContext();
  const { flushSave, localData } = useLauncherContext();
  const actionsGate = useActionsSaveGate();

  const handleSave = async () => {
    // Block the explicit Save click on incomplete behavior actions. (Note:
    // the launcher context auto-saves on every behavior update, so bad
    // data may already be in the DB by the time the user clicks Save —
    // gating here still prevents the user from dismissing the sidebar
    // while the chip is red, matching the friction point we set in
    // checklist-item / resource-center-block-action.)
    if (!actionsGate(localData?.behavior?.actions)) {
      return;
    }
    await flushSave();
    await onSaved?.();
  };

  return (
    <CardFooter className="flex p-5">
      <SidebarFooter onSave={handleSave} isLoading={isLoading} />
    </CardFooter>
  );
};

export const LauncherCore = () => {
  return (
    <SidebarContainer>
      <LauncherCoreHeader />
      <LauncherCoreBody />
      <LauncherCoreFooter />
    </SidebarContainer>
  );
};

LauncherCore.displayName = 'LauncherCore';
