'use client';

import { useAttributeList } from '../../hooks/use-attribute-list';
import { useContentList } from '../../hooks/use-content-list';
import { validateActions } from '@usertour/editor';
import { type LauncherData, LauncherActionType } from '@usertour/types';
import { useEffect } from 'react';
import { Route, Routes } from 'react-router-dom';
import { useBuilderMethods, useBuilderStore } from '../../core';
import { LauncherBuilderEmbed } from './components/launcher-embed';
import { LauncherCore } from './launcher-core';
import { LauncherTarget } from './launcher-target';
import { LauncherTooltip } from './launcher-tooltip';

// Register the auto-save validator at the router level so it survives
// sub-view switches (index ↔ target ↔ tooltip). LauncherRouter renders it
// OUTSIDE <Routes>, so it stays mounted across sub-views — it sits inside
// both AttributeListProvider and ContentListProvider, so the validation
// closure has access to ValidateContext data. Phase 1 ADR's "validation
// gates on auto-save" item: vetoes auto-save when an action chip is
// incomplete, keeping saveState dirty so the leave guard still prompts but
// the server isn't polluted. Explicit Save (Save button) bypasses the gate.
const useRegisterLauncherSaveValidator = () => {
  const { setAutoSaveValidator } = useBuilderMethods();
  const currentVersion = useBuilderStore((state) => state.currentVersion);
  const { attributeList } = useAttributeList();
  const { contents } = useContentList();

  useEffect(() => {
    setAutoSaveValidator((version) => {
      const data = version.data as LauncherData | undefined;
      if (!data) return true;
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
    return () => setAutoSaveValidator(null);
  }, [setAutoSaveValidator, attributeList, contents, currentVersion]);
};

// The Launcher builder's view router (a descendant `<Routes>` under the
// builder route's `/*`). The URL owns which sub-view is open; the
// target/tooltip drafts are seeded from currentVersion on each sub-view's
// mount (see LauncherTarget / LauncherTooltip). The save validator and the
// preview embed sit OUTSIDE <Routes> so they stay mounted across switches.
export const LauncherRouter = () => {
  useRegisterLauncherSaveValidator();
  return (
    <>
      <Routes>
        <Route index element={<LauncherCore />} />
        <Route path="target" element={<LauncherTarget />} />
        <Route path="tooltip" element={<LauncherTooltip />} />
      </Routes>
      <LauncherBuilderEmbed />
    </>
  );
};

LauncherRouter.displayName = 'LauncherRouter';
