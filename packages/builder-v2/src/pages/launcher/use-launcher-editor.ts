import { useCallback } from 'react';
import type { LauncherData } from '@usertour/types';
import { BuilderMode, useBuilderContext } from '../../contexts';
import { useTypeEditor } from '../../hooks/use-type-editor';
import { launcherTypeConfig, type LauncherUIState } from './launcher-config';

// Launcher-flavoured editor over useTypeEditor.
//
// Adds: nested-field convenience writers (updateDataTooltip /
// updateDataBehavior / updateDataTarget) since the Launcher UI splits
// the data shape into three logical groups the user edits separately;
// per-slot TUIState accessors (launcherTooltip / setLauncherTooltip
// and the target pair) so call sites don't have to spread into the
// composite TUIState struct; sub-mode navigation helpers
// (backToLauncher / gotoLauncherTarget) that wrap setCurrentMode.

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
  isLoading: boolean;
}

export const useLauncherEditor = (): UseLauncherEditorReturn => {
  const editor = useTypeEditor(launcherTypeConfig);
  const { setCurrentMode } = useBuilderContext();

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

  const backToLauncher = useCallback(() => {
    setCurrentMode({ mode: BuilderMode.LAUNCHER });
  }, [setCurrentMode]);

  const gotoLauncherTarget = useCallback(() => {
    setCurrentMode({ mode: BuilderMode.LAUNCHER_TARGET });
    setLauncherTarget(data?.target);
  }, [setCurrentMode, data?.target, setLauncherTarget]);

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
    isLoading: editor.isLoading,
  };
};
