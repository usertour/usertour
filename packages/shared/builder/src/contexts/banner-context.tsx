import { BannerData, DEFAULT_BANNER_DATA } from '@usertour/types';
import type { ContentEditorRoot } from '@usertour/types';
import { isEqual, isUndefined } from 'lodash';
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

import { deepClone } from '@usertour/helpers';
import { useToast } from '@usertour-packages/use-toast';

import { BuilderMode, useBuilderContext } from './builder-context';
import { useUpdateContentVersionMutation } from '@usertour-packages/shared-hooks';
import { getDefaultDataForType } from '../utils/default-data';

export interface BannerProviderProps {
  children: ReactNode;
}

export interface BannerContextValue {
  isLoading: boolean;
  localData: BannerData | undefined;
  updateLocalData: (data: Partial<BannerData>) => void;
  flushSave: () => Promise<void>;
}

export const BannerContext = createContext<BannerContextValue | undefined>(undefined);

export function BannerProvider(props: BannerProviderProps): JSX.Element {
  const { children } = props;
  const { currentVersion, currentMode, setIsLoading, fetchContentAndVersion, isLoading } =
    useBuilderContext();

  const { invoke: updateContentVersionMutation } = useUpdateContentVersionMutation();
  const { toast } = useToast();
  const [localData, setLocalData] = useState<BannerData | undefined>();

  const lastSavedDataRef = useRef<BannerData | null>(null);

  const saveData = useCallback(
    async (newData: BannerData) => {
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

        lastSavedDataRef.current = deepClone(newData);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: error instanceof Error ? error.message : 'Failed to save banner!',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [currentVersion, updateContentVersionMutation, fetchContentAndVersion, toast, setIsLoading],
  );

  const debouncedSaveData = useDebouncedCallback((newData: BannerData) => {
    saveData(newData);
  }, 500);

  const updateLocalData = useCallback(
    (updates: Partial<BannerData>) => {
      setLocalData((prev) => {
        if (!prev) {
          return prev;
        }
        const newData = { ...prev, ...updates };
        debouncedSaveData(newData);
        return newData;
      });
    },
    [debouncedSaveData],
  );

  const flushSave = useCallback(async () => {
    debouncedSaveData.cancel();
    if (localData) {
      await saveData(localData);
    }
  }, [debouncedSaveData, localData, saveData]);

  useEffect(() => {
    if (!currentVersion || currentMode?.mode !== BuilderMode.BANNER) {
      return;
    }

    const serverData = (currentVersion.data as BannerData | undefined) ?? DEFAULT_BANNER_DATA;
    const merged: BannerData = {
      ...DEFAULT_BANNER_DATA,
      ...serverData,
    };
    if (serverData?.contents?.length === 0 || isUndefined(serverData?.contents)) {
      merged.contents = getDefaultDataForType('tooltip') as ContentEditorRoot[];
    }

    if (!isEqual(merged, lastSavedDataRef.current)) {
      setLocalData(merged);
      lastSavedDataRef.current = deepClone(merged);
    }
  }, [currentVersion, currentMode?.mode]);

  useEvent('beforeunload', (e: BeforeUnloadEvent) => {
    const hasUnsavedChanges = localData && !isEqual(localData, lastSavedDataRef.current);
    if (hasUnsavedChanges) {
      e.preventDefault();
    }
  });

  const value: BannerContextValue = {
    isLoading,
    localData,
    updateLocalData,
    flushSave,
  };

  return <BannerContext.Provider value={value}>{children}</BannerContext.Provider>;
}

export function useBannerContext(): BannerContextValue {
  const context = useContext(BannerContext);
  if (!context) {
    throw new Error('useBannerContext must be used within a BannerProvider.');
  }
  return context;
}
