'use client';

import { CardContent, ScrollArea } from '@usertour/ui';
import { LauncherActionType } from '@usertour/types';
import { useActionsSaveGate } from '@/pages/contents/components/builder/core/hooks/use-actions-save-gate';
import { useSidebarSave } from '@/pages/contents/components/builder/core/hooks/use-sidebar-save';
import { BuilderSidebarLayout } from '@/pages/contents/components/builder/core/components/sidebar/builder-sidebar-layout';
import { SidebarTheme } from '@/pages/contents/components/builder/core/components/sidebar/sidebar-theme';
import { useLauncherEditor } from '@/pages/contents/components/builder/launcher/use-launcher-editor';
import { LauncherBehavior } from '@/pages/contents/components/builder/launcher/components/launcher-behavior';
import { LauncherTargetPreview } from '@/pages/contents/components/builder/launcher/components/launcher-target-preview';
import { LauncherType } from '@/pages/contents/components/builder/launcher/components/launcher-type';
import { LauncherZIndex } from '@/pages/contents/components/builder/launcher/components/launcher-zindex';

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

export const LauncherCore = () => {
  const { data: localData } = useLauncherEditor();
  const actionsGate = useActionsSaveGate();
  // Block the explicit Save on incomplete behavior actions when the
  // perform-action tab is active. In show-tooltip mode the actions list
  // is hidden — any residue on data.behavior.actions is stale and
  // shouldn't gate saves. The auto-save validator applies the same check.
  const handleSave = useSidebarSave({
    canSave: () =>
      !(
        localData?.behavior?.actionType === LauncherActionType.PERFORM_ACTION &&
        !actionsGate(localData?.behavior?.actions)
      ),
  });
  return (
    <BuilderSidebarLayout onSave={handleSave}>
      <LauncherCoreBody />
    </BuilderSidebarLayout>
  );
};

LauncherCore.displayName = 'LauncherCore';
