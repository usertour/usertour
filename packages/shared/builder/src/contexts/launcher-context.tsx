import { LauncherData } from '@usertour/types';
import { isEqual } from 'lodash';
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { useEvent } from 'react-use';
import { BuilderMode, useBuilderContext } from './builder-context';
import { useUpdateContentVersionMutation } from '@usertour-packages/shared-hooks';
import { useToast } from '@usertour-packages/use-toast';
import { deepClone } from '@usertour/helpers';
import { defaultLauncherData } from '../utils/default-data';

export interface LauncherProviderProps {
  children: ReactNode;
}

export interface LauncherContextValue {
  zIndex: number;
  isLoading: boolean;
  localData: LauncherData | undefined;
  backToLauncher: () => void;
  gotoLauncherTarget: () => void;
  updateLocalDataTooltip: (updates: Partial<LauncherData['tooltip']>) => void;
  updateLocalData: (data: Partial<LauncherData>) => void;
  updateLocalDataTarget: (data: Partial<LauncherData['target']>) => void;
  updateLocalDataBehavior: (data: Partial<LauncherData['behavior']>) => void;
  launcherTooltip: LauncherData['tooltip'] | undefined;
  setLauncherTooltip: React.Dispatch<React.SetStateAction<LauncherData['tooltip'] | undefined>>;
  launcherTarget: LauncherData['target'] | undefined;
  setLauncherTarget: React.Dispatch<React.SetStateAction<LauncherData['target'] | undefined>>;
  flushSave: () => Promise<void>;
}

export const LauncherContext = createContext<LauncherContextValue | undefined>(undefined);

export function LauncherProvider(props: LauncherProviderProps): JSX.Element {
  const { children } = props;
  const {
    zIndex,
    currentVersion,
    setIsLoading,
    fetchContentAndVersion,
    isLoading,
    setCurrentMode,
  } = useBuilderContext();

  const { invoke: updateContentVersionMutation } = useUpdateContentVersionMutation();
  const { toast } = useToast();
  const [localData, setLocalData] = useState<LauncherData | undefined>();
  const [launcherTooltip, setLauncherTooltip] = useState<LauncherData['tooltip'] | undefined>();
  const [launcherTarget, setLauncherTarget] = useState<LauncherData['target'] | undefined>();

  // Track the last saved data to avoid unnecessary updates
  const lastSavedDataRef = useRef<LauncherData | null>(null);

  const saveData = useCallback(
    async (newData: LauncherData) => {
      if (!currentVersion || isEqual(newData, lastSavedDataRef.current)) {
        return;
      }

      setIsLoading(true);
      try {
        await updateContentVersionMutation(currentVersion.id, {
          data: newData,
        });

        if (currentVersion.contentId) {
          await fetchContentAndVersion(currentVersion.contentId, currentVersion.id);
        }

        // Update the last saved data reference with a deep clone to avoid reference sharing
        lastSavedDataRef.current = deepClone(newData);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: error instanceof Error ? error.message : 'Failed to save launcher!',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [currentVersion, updateContentVersionMutation, fetchContentAndVersion, toast, setIsLoading],
  );

  // Create a debounced version of saveData
  const debouncedSaveData = useDebouncedCallback((newData: LauncherData) => {
    saveData(newData);
  }, 500);

  const updateLocalDataTooltip = useCallback(
    (updates: Partial<LauncherData['tooltip']>) => {
      setLocalData((prev) => {
        if (!prev) {
          return prev;
        }
        const newData = { ...prev, tooltip: { ...prev.tooltip, ...updates } };

        // Save immediately when data changes
        debouncedSaveData(newData);

        return newData;
      });
    },
    [debouncedSaveData],
  );

  const updateLocalDataBehavior = useCallback(
    (updates: Partial<LauncherData['behavior']>) => {
      setLocalData((prev) => {
        if (!prev) {
          return prev;
        }
        const newData = { ...prev, behavior: { ...prev.behavior, ...updates } };

        // Save immediately when data changes
        debouncedSaveData(newData);

        return newData;
      });
    },
    [debouncedSaveData],
  );

  const updateLocalData = useCallback(
    (updates: Partial<LauncherData>) => {
      setLocalData((prev) => {
        if (!prev) {
          return prev;
        }
        const newData = { ...prev, ...updates };

        // Save immediately when data changes
        debouncedSaveData(newData);

        return newData;
      });
    },
    [debouncedSaveData],
  );

  const updateLocalDataTarget = useCallback(
    (updates: Partial<LauncherData['target']>) => {
      setLocalData((prev) => {
        if (!prev) {
          return prev;
        }
        const newData = { ...prev, target: { ...prev.target, ...updates } };

        // Save immediately when data changes
        debouncedSaveData(newData);

        return newData;
      });
    },
    [debouncedSaveData],
  );

  const backToLauncher = useCallback(() => {
    setCurrentMode({ mode: BuilderMode.LAUNCHER });
  }, [setCurrentMode]);

  const gotoLauncherTarget = useCallback(() => {
    setCurrentMode({ mode: BuilderMode.LAUNCHER_TARGET });
    setLauncherTarget(localData?.target);
  }, [setCurrentMode, localData?.target, setLauncherTarget]);

  const flushSave = useCallback(async () => {
    debouncedSaveData.cancel();
    if (localData) {
      await saveData(localData);
    }
  }, [debouncedSaveData, localData, saveData]);

  // Only sync localData with server data when server data changes
  useEffect(() => {
    if (!currentVersion) {
      return;
    }

    const serverData = currentVersion.data || defaultLauncherData;

    if (!isEqual(serverData, lastSavedDataRef.current)) {
      setLocalData(serverData);
      // Store a deep clone to avoid reference sharing
      lastSavedDataRef.current = deepClone(serverData);
    }
  }, [currentVersion]);

  // Warn user when closing page with unsaved changes
  useEvent('beforeunload', (e: BeforeUnloadEvent) => {
    const hasUnsavedChanges = localData && !isEqual(localData, lastSavedDataRef.current);
    if (hasUnsavedChanges) {
      e.preventDefault();
    }
  });

  const value: LauncherContextValue = {
    zIndex,
    isLoading,
    localData,
    backToLauncher,
    gotoLauncherTarget,
    updateLocalDataTooltip,
    updateLocalData,
    updateLocalDataTarget,
    updateLocalDataBehavior,
    launcherTooltip,
    setLauncherTooltip,
    launcherTarget,
    setLauncherTarget,
    flushSave,
  };

  return <LauncherContext.Provider value={value}>{children}</LauncherContext.Provider>;
}

export function useLauncherContext(): LauncherContextValue {
  const context = useContext(LauncherContext);
  if (!context) {
    throw new Error('useLauncherContext must be used within a LauncherProvider.');
  }
  return context;
}
