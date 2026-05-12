'use client';

import { useAttributeListContext, useContentListContext } from '@usertour-packages/contexts';
import { validateActions } from '@usertour-packages/editor';
import { LauncherActionType } from '@usertour/types';
import { useEffect } from 'react';
import { BuilderMode, useBuilderContext, useLauncherContext } from '../../contexts';
import { LauncherBuilderEmbed } from './components/launcher-embed';
import { LauncherCore } from './launcher-core';
import { LauncherTarget } from './launcher-target';
import { LauncherTooltip } from './launcher-tooltip';

// Register the launcher-context save validator at the route level so it
// survives subpage switches (LAUNCHER ↔ LAUNCHER_TARGET ↔ LAUNCHER_TOOLTIP).
// LauncherBehavior previously owned this, but it unmounts when the user
// enters tooltip or target mode — any save dispatched from those subpages
// would then bypass the gate. LauncherBuilder is always mounted while in
// the launcher route and sits inside both AttributeListProvider and
// ContentListProvider, so it can supply the ValidateContext.
const useRegisterLauncherSaveValidator = () => {
  const { setSaveValidator } = useLauncherContext();
  const { attributeList } = useAttributeListContext();
  const { contents } = useContentListContext();
  const { currentVersion } = useBuilderContext();

  useEffect(() => {
    setSaveValidator((data) => {
      // Only the perform-action behavior surfaces an action list. In tooltip
      // mode the chips are hidden and any residue on data.behavior.actions
      // would block legitimate tooltip saves, so skip validation entirely.
      if (data.behavior?.actionType !== LauncherActionType.PERFORM_ACTION) return true;
      const actions = data.behavior?.actions;
      if (!actions?.length) return true;
      return (
        validateActions(actions, {
          attributes: attributeList ?? undefined,
          contents: contents ?? undefined,
          currentVersion: currentVersion ?? undefined,
          currentStep: undefined,
        }).length === 0
      );
    });
    return () => setSaveValidator(null);
  }, [setSaveValidator, attributeList, contents, currentVersion]);
};

export const LauncherBuilder = () => {
  const { currentMode } = useBuilderContext();
  useRegisterLauncherSaveValidator();
  return (
    <>
      {currentMode?.mode === BuilderMode.LAUNCHER && <LauncherCore />}
      {currentMode?.mode === BuilderMode.LAUNCHER_TARGET && <LauncherTarget />}
      {currentMode?.mode === BuilderMode.LAUNCHER_TOOLTIP && <LauncherTooltip />}
      <LauncherBuilderEmbed />
    </>
  );
};

LauncherBuilder.displayName = 'LauncherBuilder';
