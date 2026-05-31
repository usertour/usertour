'use client';

import { CardContent, CardFooter, CardHeader, CardTitle, ScrollArea } from '@usertour/ui';
import { LauncherActionType } from '@usertour/types';
import { useBuilderConfig, useBuilderMethods, useBuilderStore } from '../../contexts';
import { useLauncherEditor } from './use-launcher-editor';
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
  const currentContent = useBuilderStore((state) => state.currentContent);
  return (
    <CardHeader className="flex-none p-4 space-y-3">
      <CardTitle className="flex h-8	">
        <SidebarHeader title={currentContent?.name ?? ''} />
      </CardTitle>
    </CardHeader>
  );
};

const LauncherCoreFooter = () => {
  // isLoading merges initial-content load + save-in-flight (legacy
  // overload). Per docs/conventions/builder-context-migration.md.
  const isLoading = useBuilderStore(
    (state) => state.isLoading || state.saveState.status === 'saving',
  );
  const { onSaved } = useBuilderConfig();
  const { saveContent } = useBuilderMethods();
  const { data: localData } = useLauncherEditor();
  const actionsGate = useActionsSaveGate();

  const handleSave = async () => {
    // Block the explicit Save click on incomplete behavior actions when the
    // perform-action tab is active. In show-tooltip mode the actions list is
    // hidden — any residue on data.behavior.actions is stale and shouldn't
    // gate saves. The launcher context's debounced auto-save applies the
    // same actionType check; this gate adds a toast for the direct click.
    if (
      localData?.behavior?.actionType === LauncherActionType.PERFORM_ACTION &&
      !actionsGate(localData?.behavior?.actions)
    ) {
      return;
    }
    await saveContent();
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
