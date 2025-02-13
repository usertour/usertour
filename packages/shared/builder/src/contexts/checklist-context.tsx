import { useMutation } from '@apollo/client';
import { updateContentVersion } from '@usertour-ui/gql';
import { ContentEditorRoot, createValue1 } from '@usertour-ui/shared-editor';
import { ChecklistData, ChecklistItemType, DEFAULT_CHECKLIST_DATA } from '@usertour-ui/types';
import { useToast } from '@usertour-ui/use-toast';
import { deepmerge } from 'deepmerge-ts';
import { debounce, isEqual, isUndefined } from 'lodash';
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

export interface ChecklistProviderProps {
  children: ReactNode;
}

export interface ChecklistContextValue {
  zIndex: number;
  isLoading: boolean;
  localData: ChecklistData | null;
  update: (data: Partial<ChecklistData>) => Promise<void>;
  updateLocalData: (updates: Partial<ChecklistData>) => void;
  addItem: (item: ChecklistItemType) => void;
  removeItem: (id: string) => void;
  reorderItems: (startIndex: number, endIndex: number) => void;
  setCurrentItem: React.Dispatch<React.SetStateAction<ChecklistItemType | null>>;
  currentItem: ChecklistItemType | null;
  saveCurrentItem: () => void;
}

export const ChecklistContext = createContext<ChecklistContextValue | undefined>(undefined);

export function ChecklistProvider(props: ChecklistProviderProps): JSX.Element {
  const { children } = props;
  const {
    zIndex,
    currentVersion,
    setIsLoading,
    fetchContentAndVersion,
    isLoading,
    setCurrentMode,
  } = useBuilderContext();

  const data: ChecklistData | null = useMemo(() => {
    if (!currentVersion) {
      return null;
    }

    const mergedData = deepmerge(DEFAULT_CHECKLIST_DATA, currentVersion?.data ?? {});
    if (
      (currentVersion?.data?.content && currentVersion?.data?.content.length === 0) ||
      isUndefined(currentVersion?.data?.content)
    ) {
      mergedData.content = createValue1 as ContentEditorRoot[];
    }
    return mergedData;
  }, [currentVersion]);

  const [updateContentVersionMutation] = useMutation(updateContentVersion);
  const { toast } = useToast();
  const [localData, setLocalData] = useState<ChecklistData | null>(data);
  const [currentItem, setCurrentItem] = useState<ChecklistItemType | null>(null);

  const updateContentVersionData = useCallback(
    async (updates: Partial<ChecklistData>) => {
      if (!currentVersion) {
        return;
      }
      const ret = await updateContentVersionMutation({
        variables: {
          versionId: currentVersion?.id,
          content: { data: { ...data, ...updates } },
        },
      });

      if (ret.data.updateContentVersion && currentVersion?.contentId) {
        await fetchContentAndVersion(currentVersion?.contentId, currentVersion?.id);
      } else {
        throw new Error('Failed to update content version');
      }
    },
    [
      currentVersion?.id,
      currentVersion?.contentId,
      data,
      fetchContentAndVersion,
      updateContentVersionMutation,
    ],
  );

  const update = useCallback(
    async (updates: Partial<ChecklistData>) => {
      setIsLoading(true);
      try {
        await updateContentVersionData(updates);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: error instanceof Error ? error.message : 'Failed to save checklist!',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [updateContentVersionData, toast, setIsLoading],
  );

  const updateLocalData = (updates: Partial<ChecklistData>) => {
    setLocalData((prev) => {
      if (!prev) {
        return null;
      }
      return {
        ...prev,
        ...updates,
      };
    });
  };

  const saveCurrentItem = () => {
    if (!currentItem) {
      return;
    }
    setLocalData((prev) => {
      if (!prev) {
        return null;
      }
      return {
        ...prev,
        items: prev.items.map((item) => (item.id === currentItem.id ? currentItem : item)),
      };
    });
    setCurrentMode({ mode: BuilderMode.CHECKLIST });
  };

  const addItem = (item: ChecklistItemType) => {
    setLocalData((prev) => {
      if (!prev) {
        return null;
      }
      return {
        ...prev,
        items: [...prev.items, item],
      };
    });
  };

  const removeItem = useCallback((id: string) => {
    setLocalData((prev) => {
      if (!prev) {
        return null;
      }
      return {
        ...prev,
        items: prev.items.filter((item) => item.id !== id),
      };
    });
  }, []);

  const reorderItems = useCallback((startIndex: number, endIndex: number) => {
    setLocalData((prev) => {
      if (!prev) {
        return null;
      }
      const items = [...prev.items];
      const [removed] = items.splice(startIndex, 1);
      items.splice(endIndex, 0, removed);
      return { ...prev, items };
    });
  }, []);

  const debouncedUpdate = useMemo(
    () =>
      debounce((newData: ChecklistData) => {
        if (!isEqual(newData, currentVersion?.data)) {
          update(newData);
        }
      }, 500),
    [update, currentVersion?.data],
  );

  useEffect(() => {
    if (data) {
      setLocalData(data);
    }
  }, [data]);

  useEffect(() => {
    if (!localData || isEqual(localData, data)) {
      return;
    }

    debouncedUpdate(localData);

    return () => {
      debouncedUpdate.cancel();
    };
  }, [localData, debouncedUpdate]);

  const value: ChecklistContextValue = {
    zIndex,
    isLoading,
    localData,
    update,
    updateLocalData,
    removeItem,
    reorderItems,
    setCurrentItem,
    currentItem,
    addItem,
    saveCurrentItem,
  };

  return <ChecklistContext.Provider value={value}>{children}</ChecklistContext.Provider>;
}

export function useChecklistContext(): ChecklistContextValue {
  const context = useContext(ChecklistContext);
  if (!context) {
    throw new Error('useChecklistContext must be used within a ChecklistProvider.');
  }
  return context;
}
