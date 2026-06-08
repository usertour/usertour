import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ChecklistData, ChecklistItemType } from '@usertour/types';
import { useTypeEditor } from '@/pages/contents/components/builder/hooks/use-type-editor';
import { useListField } from '@/pages/contents/components/builder/hooks/use-list-field';
import { checklistTypeConfig } from '@/pages/contents/components/builder/checklist/checklist-config';

// Default draft for a NEW checklist item. The id is assigned when the new-item
// sub-view seeds it (see ChecklistItem). description is intentionally empty — a
// placeholder hints it; we don't prefill throwaway copy (matches flow, which
// only seeds a neutral 'Untitled' name and no body content).
export const defaultChecklistItem = {
  name: 'New Item',
  description: '',
  clickedActions: [],
  isCompleted: false,
  completeConditions: [],
  onlyShowTask: false,
  onlyShowTaskConditions: [],
};

// Checklist-flavoured editor. Wraps useTypeEditor and adds the item helpers and
// the saveCurrentItem flow that commits the currentItem buffer back into the
// items array. Navigation mirrors flow: startCreateItem opens the new-item
// sub-view (a draft that only lands on save), gotoItem opens an existing one;
// the currentItem draft is seeded from the route on ChecklistItem's mount.
export interface UseChecklistEditorReturn {
  data: ChecklistData;
  updateData: (updates: Partial<ChecklistData>) => void;
  currentItem: ChecklistItemType | null;
  setCurrentItem: React.Dispatch<React.SetStateAction<ChecklistItemType | null>>;
  removeItem: (id: string) => void;
  saveCurrentItem: () => void;
  startCreateItem: () => void;
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

  const backToChecklist = useCallback(() => {
    navigate('..');
  }, [navigate]);

  const gotoItem = useCallback(
    (id: string) => {
      navigate(`item/${id}`);
    },
    [navigate],
  );

  // Add item → open the new-item sub-view (a draft). The item only lands in the
  // array on save, mirroring flow's "Add step → step/new → save commits".
  const startCreateItem = useCallback(() => {
    navigate('item/new');
  }, [navigate]);

  // Commit the currentItem draft: update in place if its id already exists,
  // otherwise append (the new-item case).
  const saveCurrentItem = useCallback(() => {
    if (!currentItem) {
      return;
    }
    const exists = items.some((item) => item.id === currentItem.id);
    editor.updateData({
      items: exists
        ? items.map((item) => (item.id === currentItem.id ? currentItem : item))
        : [...items, currentItem],
    });
    // Exit the per-item edit sub-view back to the main checklist view.
    navigate('..');
  }, [currentItem, items, editor.updateData, navigate]);

  return {
    data,
    updateData: editor.updateData,
    currentItem,
    setCurrentItem,
    removeItem: itemList.removeById,
    saveCurrentItem,
    startCreateItem,
    gotoItem,
    backToChecklist,
    isLoading: editor.isLoading,
  };
};
