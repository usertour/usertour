import { useMutation } from '@apollo/client';
import { updateContentVersion } from '@usertour-ui/gql';
import { DEFAULT_LAUNCHER_DATA, LauncherData } from '@usertour-ui/types';
import { debounce, isEqual } from 'lodash';
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { BuilderMode, useBuilderContext } from './builder-context';

export interface LauncherProviderProps {
  children: ReactNode;
}

export interface LauncherContextValue {
  zIndex: number;
  isLoading: boolean;
  localData: LauncherData | undefined;
  backToLauncher: () => void;
  gotoLauncherTarget: () => void;
  saveLocalData: () => Promise<void>;
  updateLocalDataTooltip: (updates: Partial<LauncherData['tooltip']>) => void;
  updateLocalData: (data: Partial<LauncherData>) => void;
  updateLocalDataTarget: (data: Partial<LauncherData['target']>) => void;
  updateLocalDataBehavior: (data: Partial<LauncherData['behavior']>) => void;
  launcherTooltip: LauncherData['tooltip'] | undefined;
  setLauncherTooltip: React.Dispatch<React.SetStateAction<LauncherData['tooltip'] | undefined>>;
  launcherTarget: LauncherData['target'] | undefined;
  setLauncherTarget: React.Dispatch<React.SetStateAction<LauncherData['target'] | undefined>>;
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

  const [updateContentVersionMutation] = useMutation(updateContentVersion);

  const [localData, setLocalData] = useState<LauncherData | undefined>();

  const [launcherTooltip, setLauncherTooltip] = useState<LauncherData['tooltip'] | undefined>();
  const [launcherTarget, setLauncherTarget] = useState<LauncherData['target'] | undefined>();

  const updateContentVersionData = useCallback(
    async (updates: Partial<LauncherData>) => {
      setIsLoading(true);
      const ret = await updateContentVersionMutation({
        variables: {
          versionId: currentVersion?.id,
          content: { data: { ...localData, ...updates } },
        },
      });

      if (ret.data.updateContentVersion && currentVersion?.contentId) {
        await fetchContentAndVersion(currentVersion?.contentId, currentVersion?.id);
      } else {
        throw new Error('Failed to update content version');
      }
      setIsLoading(false);
    },
    [
      currentVersion?.id,
      currentVersion?.contentId,
      localData,
      fetchContentAndVersion,
      updateContentVersionMutation,
    ],
  );

  const debouncedUpdate = useMemo(
    () =>
      debounce((newData: Partial<LauncherData>) => {
        if (!isEqual(newData, currentVersion?.data)) {
          updateContentVersionData(newData);
        }
      }, 500),
    [updateContentVersionData, currentVersion?.data],
  );

  const updateLocalDataTooltip = (updates: Partial<LauncherData['tooltip']>) => {
    setLocalData((prev) => {
      if (prev) {
        return { ...prev, tooltip: { ...prev.tooltip, ...updates } };
      }
    });
  };

  const updateLocalDataBehavior = (updates: Partial<LauncherData['behavior']>) => {
    setLocalData((prev) => {
      if (prev) {
        return { ...prev, behavior: { ...prev.behavior, ...updates } };
      }
    });
  };

  const updateLocalData = (updates: Partial<LauncherData>) => {
    setLocalData((prev) => {
      if (prev) {
        return { ...prev, ...updates };
      }
    });
  };

  const updateLocalDataTarget = (updates: Partial<LauncherData['target']>) => {
    setLocalData((prev) => {
      if (prev) {
        return { ...prev, target: { ...prev.target, ...updates } };
      }
    });
  };

  const saveLocalData = useCallback(async () => {
    try {
      if (!localData) {
        return;
      }
      await updateContentVersionData(localData);
      setCurrentMode({ mode: BuilderMode.LAUNCHER });
    } catch (error) {
      console.error('Failed to save changes:', error);
    }
  }, [localData, updateContentVersionData, setCurrentMode]);

  const backToLauncher = useCallback(() => {
    setCurrentMode({ mode: BuilderMode.LAUNCHER });
  }, [setCurrentMode]);

  const gotoLauncherTarget = useCallback(() => {
    setCurrentMode({ mode: BuilderMode.LAUNCHER_TARGET });
    setLauncherTarget(localData?.target);
  }, [setCurrentMode, localData?.target, setLauncherTarget]);

  useEffect(() => {
    if (!currentVersion) {
      return;
    }

    if (currentVersion.data) {
      setLocalData(currentVersion?.data);
    } else {
      setLocalData(DEFAULT_LAUNCHER_DATA);
    }
  }, [currentVersion]);

  useEffect(() => {
    if (!localData || isEqual(localData, currentVersion?.data)) {
      return;
    }

    debouncedUpdate(localData);

    return () => {
      debouncedUpdate.cancel();
    };
  }, [localData, debouncedUpdate, currentVersion?.data]);

  const value: LauncherContextValue = {
    zIndex,
    isLoading,
    localData,
    saveLocalData,
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
