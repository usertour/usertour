import { useCallback } from 'react';
import type { ChecklistData, ChecklistItemType } from '@usertour/types';
import { useTypeEditor } from '../../hooks/use-type-editor';
import { useBuilderContext, BuilderMode } from '../../contexts';
import { checklistTypeConfig } from './checklist-config';

// Checklist-flavoured editor. Wraps useTypeEditor and adds the
// imperative item-array helpers (addItem / removeItem / reorderItems)
// and the saveCurrentItem flow that commits the UI-state currentItem
// buffer back into the items array. Each helper delegates to
// updateData so all writes go through the FSM dispatcher (PR ζ)
// uniformly.

export interface UseChecklistEditorReturn {
  data: ChecklistData | undefined;
  updateData: (updates: Partial<ChecklistData>) => void;
  currentItem: ChecklistItemType | null;
  setCurrentItem: React.Dispatch<React.SetStateAction<ChecklistItemType | null>>;
  addItem: (item: ChecklistItemType) => void;
  removeItem: (id: string) => void;
  reorderItems: (startIndex: number, endIndex: number) => void;
  saveCurrentItem: () => void;
  isLoading: boolean;
}

export const useChecklistEditor = (): UseChecklistEditorReturn => {
  const editor = useTypeEditor(checklistTypeConfig);
  const { setCurrentMode } = useBuilderContext();

  const data = editor.data;
  const items = data?.items ?? [];
  const currentItem = editor.uiState;
  const setCurrentItem = editor.setUIState;

  const addItem = useCallback(
    (item: ChecklistItemType) => {
      editor.updateData({ items: [...items, item] });
    },
    [editor.updateData, items],
  );

  const removeItem = useCallback(
    (id: string) => {
      editor.updateData({ items: items.filter((item) => item.id !== id) });
    },
    [editor.updateData, items],
  );

  const reorderItems = useCallback(
    (startIndex: number, endIndex: number) => {
      const next = [...items];
      const [removed] = next.splice(startIndex, 1);
      next.splice(endIndex, 0, removed);
      editor.updateData({ items: next });
    },
    [editor.updateData, items],
  );

  const saveCurrentItem = useCallback(() => {
    if (!currentItem) {
      return;
    }
    editor.updateData({
      items: items.map((item) => (item.id === currentItem.id ? currentItem : item)),
    });
    // Exit the per-item edit sub-mode back to the main checklist view.
    setCurrentMode({ mode: BuilderMode.CHECKLIST });
  }, [currentItem, items, editor.updateData, setCurrentMode]);

  return {
    data,
    updateData: editor.updateData,
    currentItem,
    setCurrentItem,
    addItem,
    removeItem,
    reorderItems,
    saveCurrentItem,
    isLoading: editor.isLoading,
  };
};
