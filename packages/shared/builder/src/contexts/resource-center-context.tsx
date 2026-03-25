import {
  ResourceCenterBlock,
  ResourceCenterData,
  DEFAULT_RESOURCE_CENTER_DATA,
} from '@usertour/types';
import { useToast } from '@usertour-packages/use-toast';
import { deepmerge } from 'deepmerge-ts';
import { isEqual } from 'lodash';
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useDebouncedCallback } from 'use-debounce';
import { useEvent } from 'react-use';
import { BuilderMode, useBuilderContext } from './builder-context';
import { useUpdateContentVersionMutation } from '@usertour-packages/shared-hooks';
import { deepClone } from '@usertour/helpers';

export interface ResourceCenterProviderProps {
  children: ReactNode;
}

export interface ResourceCenterContextValue {
  zIndex: number;
  isLoading: boolean;
  localData: ResourceCenterData | null;
  update: (data: ResourceCenterData) => Promise<void>;
  updateLocalData: (updates: Partial<ResourceCenterData>) => void;
  addBlock: (block: ResourceCenterBlock) => void;
  removeBlock: (id: string) => void;
  updateBlock: (id: string, updates: Partial<ResourceCenterBlock>) => void;
  reorderBlocks: (startIndex: number, endIndex: number) => void;
  setCurrentBlock: React.Dispatch<React.SetStateAction<ResourceCenterBlock | null>>;
  currentBlock: ResourceCenterBlock | null;
  saveCurrentBlock: () => void;
  flushSave: () => Promise<void>;
}

export const ResourceCenterContext = createContext<ResourceCenterContextValue | undefined>(
  undefined,
);

export function ResourceCenterProvider(props: ResourceCenterProviderProps): JSX.Element {
  const { children } = props;
  const {
    zIndex,
    currentVersion,
    setIsLoading,
    fetchContentAndVersion,
    isLoading,
    setCurrentMode,
  } = useBuilderContext();

  const data: ResourceCenterData | null = useMemo(() => {
    if (!currentVersion) {
      return null;
    }
    return deepmerge(DEFAULT_RESOURCE_CENTER_DATA, currentVersion?.data ?? {});
  }, [currentVersion]);

  const { invoke: updateContentVersionMutation } = useUpdateContentVersionMutation();
  const { toast } = useToast();
  const [localData, setLocalData] = useState<ResourceCenterData | null>(data);
  const [currentBlock, setCurrentBlock] = useState<ResourceCenterBlock | null>(null);

  const lastSavedDataRef = useRef<ResourceCenterData | null>(null);

  const update = useCallback(
    async (newData: ResourceCenterData) => {
      if (!currentVersion) {
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
          title: error instanceof Error ? error.message : 'Failed to save resource center!',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [currentVersion, updateContentVersionMutation, fetchContentAndVersion, toast, setIsLoading],
  );

  const debouncedSave = useDebouncedCallback((newData: ResourceCenterData) => {
    if (!isEqual(newData, lastSavedDataRef.current)) {
      update(newData);
    }
  }, 500);

  const updateLocalData = useCallback(
    (updates: Partial<ResourceCenterData>) => {
      setLocalData((prev) => {
        if (!prev) {
          return null;
        }
        const newData = { ...prev, ...updates };

        if (!isEqual(newData, lastSavedDataRef.current)) {
          debouncedSave(newData);
        }

        return newData;
      });
    },
    [debouncedSave],
  );

  const saveCurrentBlock = useCallback(() => {
    if (!currentBlock) {
      return;
    }
    setLocalData((prev) => {
      if (!prev) {
        return null;
      }
      const newData = {
        ...prev,
        blocks: prev.blocks.map((block) => (block.id === currentBlock.id ? currentBlock : block)),
      };

      if (!isEqual(newData, lastSavedDataRef.current)) {
        debouncedSave(newData);
      }

      return newData;
    });
    setCurrentMode({ mode: BuilderMode.RESOURCE_CENTER });
  }, [currentBlock, setCurrentMode, debouncedSave]);

  const addBlock = useCallback(
    (block: ResourceCenterBlock) => {
      setLocalData((prev) => {
        if (!prev) {
          return null;
        }
        const newData = {
          ...prev,
          blocks: [...prev.blocks, block],
        };

        if (!isEqual(newData, lastSavedDataRef.current)) {
          debouncedSave(newData);
        }

        return newData;
      });
    },
    [debouncedSave],
  );

  const removeBlock = useCallback(
    (id: string) => {
      setLocalData((prev) => {
        if (!prev) {
          return null;
        }
        const newData = {
          ...prev,
          blocks: prev.blocks.filter((block) => block.id !== id),
        };

        if (!isEqual(newData, lastSavedDataRef.current)) {
          debouncedSave(newData);
        }

        return newData;
      });
    },
    [debouncedSave],
  );

  const updateBlock = useCallback(
    (id: string, updates: Partial<ResourceCenterBlock>) => {
      setLocalData((prev) => {
        if (!prev) {
          return null;
        }
        const newData = {
          ...prev,
          blocks: prev.blocks.map((block) =>
            block.id === id ? ({ ...block, ...updates } as ResourceCenterBlock) : block,
          ),
        };

        if (!isEqual(newData, lastSavedDataRef.current)) {
          debouncedSave(newData);
        }

        return newData;
      });
    },
    [debouncedSave],
  );

  const reorderBlocks = useCallback(
    (startIndex: number, endIndex: number) => {
      setLocalData((prev) => {
        if (!prev) {
          return null;
        }
        const blocks = [...prev.blocks];
        const [removed] = blocks.splice(startIndex, 1);
        blocks.splice(endIndex, 0, removed);
        const newData = { ...prev, blocks };

        if (!isEqual(newData, lastSavedDataRef.current)) {
          debouncedSave(newData);
        }

        return newData;
      });
    },
    [debouncedSave],
  );

  const flushSave = useCallback(async () => {
    debouncedSave.cancel();
    if (localData) {
      await update(localData);
    }
  }, [debouncedSave, localData, update]);

  useEffect(() => {
    if (data && !isEqual(data, lastSavedDataRef.current)) {
      setLocalData(data);
      lastSavedDataRef.current = deepClone(data);
    }
  }, [data]);

  useEvent('beforeunload', (e: BeforeUnloadEvent) => {
    const hasUnsavedChanges = localData && !isEqual(localData, lastSavedDataRef.current);
    if (hasUnsavedChanges) {
      e.preventDefault();
    }
  });

  const value: ResourceCenterContextValue = {
    zIndex,
    isLoading,
    localData,
    update,
    updateLocalData,
    removeBlock,
    updateBlock,
    reorderBlocks,
    setCurrentBlock,
    currentBlock,
    addBlock,
    saveCurrentBlock,
    flushSave,
  };

  return <ResourceCenterContext.Provider value={value}>{children}</ResourceCenterContext.Provider>;
}

export function useResourceCenterContext(): ResourceCenterContextValue {
  const context = useContext(ResourceCenterContext);
  if (!context) {
    throw new Error('useResourceCenterContext must be used within a ResourceCenterProvider.');
  }
  return context;
}
