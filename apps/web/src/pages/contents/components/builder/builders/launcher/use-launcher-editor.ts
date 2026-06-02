import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LauncherData } from '@usertour/types';
import { useTypeEditor } from '@/pages/contents/components/builder/hooks/use-type-editor';
import {
  launcherTypeConfig,
  type LauncherUIState,
} from '@/pages/contents/components/builder/builders/launcher/launcher-config';

// Launcher-flavoured editor over useTypeEditor.
//
// Adds: nested-field convenience writers (updateDataTooltip /
// updateDataBehavior / updateDataTarget) since the Launcher UI splits
// the data shape into three logical groups the user edits separately;
// per-slot TUIState accessors (launcherTooltip / setLauncherTooltip
// and the target pair) so call sites don't have to spread into the
// composite TUIState struct; sub-view navigation helpers
// (backToLauncher / gotoLauncherTarget / gotoLauncherTooltip) that move
// the descendant router — the URL owns which sub-view is open, and the
// target/tooltip drafts are seeded from currentVersion on the sub-view's
// mount (see LauncherTarget / LauncherTooltip), not here.

export interface UseLauncherEditorReturn {
  data: LauncherData | undefined;
  updateData: (updates: Partial<LauncherData>) => void;
  updateDataTooltip: (updates: Partial<LauncherData['tooltip']>) => void;
  updateDataBehavior: (updates: Partial<LauncherData['behavior']>) => void;
  updateDataTarget: (updates: Partial<LauncherData['target']>) => void;
  launcherTooltip: LauncherData['tooltip'] | undefined;
  setLauncherTooltip: React.Dispatch<React.SetStateAction<LauncherData['tooltip'] | undefined>>;
  launcherTarget: LauncherData['target'] | undefined;
  setLauncherTarget: React.Dispatch<React.SetStateAction<LauncherData['target'] | undefined>>;
  backToLauncher: () => void;
  gotoLauncherTarget: () => void;
  gotoLauncherTooltip: () => void;
  isLoading: boolean;
}

export const useLauncherEditor = (): UseLauncherEditorReturn => {
  const editor = useTypeEditor(launcherTypeConfig);
  const navigate = useNavigate();

  const data = editor.data;
  const uiState = editor.uiState;
  const setUIState = editor.setUIState;

  // Per-slot UI state setters — each shells out to setUIState with
  // the right partial. Match React.Dispatch signature so call sites
  // that pass either a value or an updater function both work.
  const setLauncherTooltip = useCallback<
    React.Dispatch<React.SetStateAction<LauncherData['tooltip'] | undefined>>
  >(
    (value) => {
      setUIState((prev: LauncherUIState) => ({
        ...prev,
        tooltip:
          typeof value === 'function'
            ? (
                value as (
                  p: LauncherData['tooltip'] | undefined,
                ) => LauncherData['tooltip'] | undefined
              )(prev.tooltip)
            : value,
      }));
    },
    [setUIState],
  );
  const setLauncherTarget = useCallback<
    React.Dispatch<React.SetStateAction<LauncherData['target'] | undefined>>
  >(
    (value) => {
      setUIState((prev: LauncherUIState) => ({
        ...prev,
        target:
          typeof value === 'function'
            ? (
                value as (
                  p: LauncherData['target'] | undefined,
                ) => LauncherData['target'] | undefined
              )(prev.target)
            : value,
      }));
    },
    [setUIState],
  );

  const updateDataTooltip = useCallback(
    (updates: Partial<LauncherData['tooltip']>) => {
      if (!data) {
        return;
      }
      editor.updateData({ tooltip: { ...data.tooltip, ...updates } });
    },
    [editor.updateData, data],
  );

  const updateDataBehavior = useCallback(
    (updates: Partial<LauncherData['behavior']>) => {
      if (!data) {
        return;
      }
      editor.updateData({ behavior: { ...data.behavior, ...updates } });
    },
    [editor.updateData, data],
  );

  const updateDataTarget = useCallback(
    (updates: Partial<LauncherData['target']>) => {
      if (!data) {
        return;
      }
      editor.updateData({ target: { ...data.target, ...updates } });
    },
    [editor.updateData, data],
  );

  // Sub-view navigation — the descendant router owns which launcher
  // sub-view is open (index / target / tooltip). The target & tooltip
  // drafts are seeded from currentVersion on each sub-view's mount, so
  // these only move the URL.
  const backToLauncher = useCallback(() => {
    navigate('..');
  }, [navigate]);

  const gotoLauncherTarget = useCallback(() => {
    navigate('target');
  }, [navigate]);

  const gotoLauncherTooltip = useCallback(() => {
    navigate('tooltip');
  }, [navigate]);

  return {
    data,
    updateData: editor.updateData,
    updateDataTooltip,
    updateDataBehavior,
    updateDataTarget,
    launcherTooltip: uiState.tooltip,
    setLauncherTooltip,
    launcherTarget: uiState.target,
    setLauncherTarget,
    backToLauncher,
    gotoLauncherTarget,
    gotoLauncherTooltip,
    isLoading: editor.isLoading,
  };
};
