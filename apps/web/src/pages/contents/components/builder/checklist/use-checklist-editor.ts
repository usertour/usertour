import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ChecklistData, ChecklistItemType } from '@usertour/types';
import { useTypeEditor } from '@/pages/contents/components/builder/hooks/use-type-editor';
import { useListField } from '@/pages/contents/components/builder/hooks/use-list-field';
import { checklistTypeConfig } from '@/pages/contents/components/builder/checklist/checklist-config';

// Checklist-flavoured editor. Wraps useTypeEditor and adds the imperative
// item-array helpers (addItem / removeItem) and the saveCurrentItem flow that
// commits the UI-state currentItem buffer back into the items array. Each
// helper delegates to updateData so all writes go through the FSM dispatcher
// uniformly. Sub-view navigation helpers (gotoItem / backToChecklist) move the
// descendant router — the URL owns which item is open, and the currentItem
// draft is seeded from currentVersion by the :itemId param on ChecklistItem's
// mount, not here.

export interface UseChecklistEditorReturn {
  data: ChecklistData;
  updateData: (updates: Partial<ChecklistData>) => void;
  currentItem: ChecklistItemType | null;
  setCurrentItem: React.Dispatch<React.SetStateAction<ChecklistItemType | null>>;
  addItem: (item: ChecklistItemType) => void;
  removeItem: (id: string) => void;
  saveCurrentItem: () => void;
  gotoItem: (id: string) => void;
  backToChecklist: () => void;
  isLoading: boolean;
}

export const useChecklistEditor = (): UseChecklistEditorReturn => {
  const editor = useTypeEditor(checklistTypeConfig);
  const navigate = useNavigate();

  const data = editor.data;
  const items = data.items;
  const currentItem = editor.uiState;
  const setCurrentItem = editor.setUIState;

  const itemList = useListField<ChecklistItemType>({
    items,
    setItems: (next) => editor.updateData({ items: next }),
  });

  // Sub-view navigation — the descendant router owns which item is open. The
  // currentItem draft is seeded from currentVersion on ChecklistItem's mount,
  // so these only move the URL.
  const backToChecklist = useCallback(() => {
    navigate('..');
  }, [navigate]);

  const gotoItem = useCallback(
    (id: string) => {
      navigate(`item/${id}`);
    },
    [navigate],
  );

  const saveCurrentItem = useCallback(() => {
    if (!currentItem) {
      return;
    }
    editor.updateData({
      items: items.map((item) => (item.id === currentItem.id ? currentItem : item)),
    });
    // Exit the per-item edit sub-view back to the main checklist view.
    navigate('..');
  }, [currentItem, items, editor.updateData, navigate]);

  return {
    data,
    updateData: editor.updateData,
    currentItem,
    setCurrentItem,
    addItem: itemList.add,
    removeItem: itemList.removeById,
    saveCurrentItem,
    gotoItem,
    backToChecklist,
    isLoading: editor.isLoading,
  };
};
