import { useCallback } from 'react';
import type { ChecklistData, ChecklistItemType } from '@usertour/types';
import { useTypeEditor } from '../../hooks/use-type-editor';
import { useListField } from '../../hooks/use-list-field';
import { useBuilderStore, BuilderMode } from '../../core';
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
  saveCurrentItem: () => void;
  isLoading: boolean;
}

export const useChecklistEditor = (): UseChecklistEditorReturn => {
  const editor = useTypeEditor(checklistTypeConfig);
  const setCurrentMode = useBuilderStore((state) => state.setCurrentMode);

  const data = editor.data;
  const items = data?.items ?? [];
  const currentItem = editor.uiState;
  const setCurrentItem = editor.setUIState;

  const itemList = useListField<ChecklistItemType>({
    items,
    setItems: (next) => editor.updateData({ items: next }),
  });

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
    addItem: itemList.add,
    removeItem: itemList.removeById,
    saveCurrentItem,
    isLoading: editor.isLoading,
  };
};
