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
  useRef,
  useState,
} from 'react';
import { BuilderMode, useBuilderContext } from './builder-context';
import { useUpdateContentVersionMutation } from '@usertour-ui/shared-hooks';

export interface ChecklistProviderProps {
  children: ReactNode;
}

export interface ChecklistContextValue {
  zIndex: number;
  isLoading: boolean;
  localData: ChecklistData | null;
  update: (data: ChecklistData) => Promise<void>;
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

  const { invoke: updateContentVersionMutation } = useUpdateContentVersionMutation();
  const { toast } = useToast();
  const [localData, setLocalData] = useState<ChecklistData | null>(data);
  const [currentItem, setCurrentItem] = useState<ChecklistItemType | null>(null);

  // Track the last saved data to avoid unnecessary updates
  const lastSavedDataRef = useRef<ChecklistData | null>(null);

  const update = useCallback(
    async (newData: ChecklistData) => {
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

        // Update the last saved data reference
        lastSavedDataRef.current = newData;
      } catch (error) {
        toast({
          variant: 'destructive',
          title: error instanceof Error ? error.message : 'Failed to save checklist!',
        });
      } finally {
        setIsLoading(false);
      }
    },
    [currentVersion, updateContentVersionMutation, fetchContentAndVersion, toast, setIsLoading],
  );

  // Create a debounced save function that only triggers when data actually changes
  const debouncedSave = useMemo(
    () =>
      debounce((newData: ChecklistData) => {
        if (!isEqual(newData, lastSavedDataRef.current)) {
          update(newData);
        }
      }, 500),
    [update],
  );

  // Unified update function that handles both local state and server updates
  const updateLocalData = useCallback(
    (updates: Partial<ChecklistData>) => {
      setLocalData((prev) => {
        if (!prev) {
          return null;
        }
        const newData = { ...prev, ...updates };

        // Trigger debounced save if data has changed
        if (!isEqual(newData, lastSavedDataRef.current)) {
          debouncedSave(newData);
        }

        return newData;
      });
    },
    [debouncedSave],
  );

  const saveCurrentItem = useCallback(() => {
    if (!currentItem) {
      return;
    }
    setLocalData((prev) => {
      if (!prev) {
        return null;
      }
      const newData = {
        ...prev,
        items: prev.items.map((item) => (item.id === currentItem.id ? currentItem : item)),
      };

      // Trigger debounced save for current item
      if (!isEqual(newData, lastSavedDataRef.current)) {
        debouncedSave(newData);
      }

      return newData;
    });
    setCurrentMode({ mode: BuilderMode.CHECKLIST });
  }, [currentItem, setCurrentMode, debouncedSave]);

  const addItem = useCallback(
    (item: ChecklistItemType) => {
      setLocalData((prev) => {
        if (!prev) {
          return null;
        }
        const newData = {
          ...prev,
          items: [...prev.items, item],
        };

        // Trigger debounced save
        if (!isEqual(newData, lastSavedDataRef.current)) {
          debouncedSave(newData);
        }

        return newData;
      });
    },
    [debouncedSave],
  );

  const removeItem = useCallback(
    (id: string) => {
      setLocalData((prev) => {
        if (!prev) {
          return null;
        }
        const newData = {
          ...prev,
          items: prev.items.filter((item) => item.id !== id),
        };

        // Trigger debounced save
        if (!isEqual(newData, lastSavedDataRef.current)) {
          debouncedSave(newData);
        }

        return newData;
      });
    },
    [debouncedSave],
  );

  const reorderItems = useCallback(
    (startIndex: number, endIndex: number) => {
      setLocalData((prev) => {
        if (!prev) {
          return null;
        }
        const items = [...prev.items];
        const [removed] = items.splice(startIndex, 1);
        items.splice(endIndex, 0, removed);
        const newData = { ...prev, items };

        // Trigger debounced save
        if (!isEqual(newData, lastSavedDataRef.current)) {
          debouncedSave(newData);
        }

        return newData;
      });
    },
    [debouncedSave],
  );

  // Only sync localData with server data when server data changes
  useEffect(() => {
    if (data && !isEqual(data, lastSavedDataRef.current)) {
      setLocalData(data);
      lastSavedDataRef.current = data;
    }
  }, [data]);

  // Cleanup debounced function on unmount
  useEffect(() => {
    return () => {
      if (debouncedSave) {
        debouncedSave.cancel();
      }
    };
  }, []);

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
