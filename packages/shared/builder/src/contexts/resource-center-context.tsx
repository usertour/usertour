import {
  ResourceCenterBlock,
  ResourceCenterData,
  ResourceCenterTab,
  DEFAULT_RESOURCE_CENTER_DATA,
  LauncherIconSource,
} from '@usertour/types';
import { useToast } from '@usertour-packages/use-toast';
import { isEqual } from 'lodash';
import { uuidV4 } from '@usertour/helpers';
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

  // Tab management
  currentTabId: string | null;
  setCurrentTabId: (tabId: string | null) => void;
  addTab: (tab: ResourceCenterTab) => void;
  removeTab: (tabId: string) => void;
  updateTab: (tabId: string, updates: Partial<ResourceCenterTab>) => void;
  reorderTabs: (startIndex: number, endIndex: number) => void;

  // Block management (operates on currentTabId's blocks)
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

/** Helper: update blocks within a specific tab */
function updateTabBlocks(
  data: ResourceCenterData,
  tabId: string,
  updater: (blocks: ResourceCenterBlock[]) => ResourceCenterBlock[],
): ResourceCenterData {
  return {
    ...data,
    tabs: data.tabs.map((tab) =>
      tab.id === tabId ? { ...tab, blocks: updater(tab.blocks) } : tab,
    ),
  };
}

/** Ensure data always has at least one tab (Home) */
function ensureResourceCenterData(
  raw: Partial<ResourceCenterData> & { blocks?: ResourceCenterBlock[] },
): ResourceCenterData {
  const merged: ResourceCenterData = {
    buttonText: raw.buttonText ?? DEFAULT_RESOURCE_CENTER_DATA.buttonText,
    headerText: raw.headerText ?? DEFAULT_RESOURCE_CENTER_DATA.headerText,
    tabs: raw.tabs ?? DEFAULT_RESOURCE_CENTER_DATA.tabs,
  };

  if (merged.tabs.length > 0) {
    return merged;
  }

  const homeTab: ResourceCenterTab = {
    id: uuidV4(),
    name: 'Home',
    iconSource: LauncherIconSource.BUILTIN,
    iconType: 'home-smile-2-line',
    blocks: raw.blocks ?? [],
  };

  return {
    ...merged,
    tabs: [homeTab],
  };
}

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
    return ensureResourceCenterData(currentVersion?.data ?? {});
  }, [currentVersion]);

  const { invoke: updateContentVersionMutation } = useUpdateContentVersionMutation();
  const { toast } = useToast();
  const [localData, setLocalData] = useState<ResourceCenterData | null>(data);
  const [currentBlock, setCurrentBlock] = useState<ResourceCenterBlock | null>(null);
  const [currentTabId, setCurrentTabId] = useState<string | null>(null);

  // Auto-select first tab when data loads
  useEffect(() => {
    if (localData?.tabs?.length && !currentTabId) {
      setCurrentTabId(localData.tabs[0].id);
    }
  }, [localData, currentTabId]);

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

  /** Helper: set local data and trigger debounced save */
  const setAndSave = useCallback(
    (updater: (prev: ResourceCenterData) => ResourceCenterData) => {
      setLocalData((prev) => {
        if (!prev) return null;
        const newData = updater(prev);
        if (!isEqual(newData, lastSavedDataRef.current)) {
          debouncedSave(newData);
        }
        return newData;
      });
    },
    [debouncedSave],
  );

  const updateLocalData = useCallback(
    (updates: Partial<ResourceCenterData>) => {
      setAndSave((prev) => ({ ...prev, ...updates }));
    },
    [setAndSave],
  );

  // ── Tab operations ────────────────────────────────────────────────

  const addTab = useCallback(
    (tab: ResourceCenterTab) => {
      setAndSave((prev) => ({ ...prev, tabs: [...prev.tabs, tab] }));
      setCurrentTabId(tab.id);
    },
    [setAndSave],
  );

  const removeTab = useCallback(
    (tabId: string) => {
      setAndSave((prev) => {
        const newTabs = prev.tabs.filter((t) => t.id !== tabId);
        return { ...prev, tabs: newTabs };
      });
      // If removing the current tab, switch to first tab
      setCurrentTabId((prevTabId) => {
        if (prevTabId === tabId) {
          return localData?.tabs[0]?.id ?? null;
        }
        return prevTabId;
      });
    },
    [setAndSave, localData],
  );

  const updateTab = useCallback(
    (tabId: string, updates: Partial<ResourceCenterTab>) => {
      setAndSave((prev) => ({
        ...prev,
        tabs: prev.tabs.map((tab) => (tab.id === tabId ? { ...tab, ...updates } : tab)),
      }));
    },
    [setAndSave],
  );

  const reorderTabs = useCallback(
    (startIndex: number, endIndex: number) => {
      setAndSave((prev) => {
        const tabs = [...prev.tabs];
        const [removed] = tabs.splice(startIndex, 1);
        tabs.splice(endIndex, 0, removed);
        return { ...prev, tabs };
      });
    },
    [setAndSave],
  );

  // ── Block operations (scoped to currentTabId) ─────────────────────

  const saveCurrentBlock = useCallback(() => {
    if (!currentBlock || !currentTabId) {
      return;
    }
    setAndSave((prev) =>
      updateTabBlocks(prev, currentTabId, (blocks) =>
        blocks.map((block) => (block.id === currentBlock.id ? currentBlock : block)),
      ),
    );
    setCurrentMode({ mode: BuilderMode.RESOURCE_CENTER });
  }, [currentBlock, currentTabId, setCurrentMode, setAndSave]);

  const addBlock = useCallback(
    (block: ResourceCenterBlock) => {
      if (!currentTabId) return;
      setAndSave((prev) => updateTabBlocks(prev, currentTabId, (blocks) => [...blocks, block]));
    },
    [currentTabId, setAndSave],
  );

  const removeBlock = useCallback(
    (id: string) => {
      if (!currentTabId) return;
      setAndSave((prev) =>
        updateTabBlocks(prev, currentTabId, (blocks) => blocks.filter((b) => b.id !== id)),
      );
    },
    [currentTabId, setAndSave],
  );

  const updateBlock = useCallback(
    (id: string, updates: Partial<ResourceCenterBlock>) => {
      if (!currentTabId) return;
      setAndSave((prev) =>
        updateTabBlocks(prev, currentTabId, (blocks) =>
          blocks.map((block) =>
            block.id === id ? ({ ...block, ...updates } as ResourceCenterBlock) : block,
          ),
        ),
      );
    },
    [currentTabId, setAndSave],
  );

  const reorderBlocks = useCallback(
    (startIndex: number, endIndex: number) => {
      if (!currentTabId) return;
      setAndSave((prev) =>
        updateTabBlocks(prev, currentTabId, (blocks) => {
          const newBlocks = [...blocks];
          const [removed] = newBlocks.splice(startIndex, 1);
          newBlocks.splice(endIndex, 0, removed);
          return newBlocks;
        }),
      );
    },
    [currentTabId, setAndSave],
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
    currentTabId,
    setCurrentTabId,
    addTab,
    removeTab,
    updateTab,
    reorderTabs,
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
