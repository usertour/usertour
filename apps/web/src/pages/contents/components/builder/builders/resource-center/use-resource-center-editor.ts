import { useCallback, useEffect } from 'react';
import {
  LiveChatProvider,
  type ResourceCenterBlock,
  ResourceCenterBlockType,
  type ResourceCenterData,
  type ResourceCenterTab,
} from '@usertour/types';
import { isRichTextEmpty } from '@usertour/helpers';
import { BuilderMode, useBuilderStore } from '../../core';
import { useTypeEditor } from '../../hooks/use-type-editor';
import { useListField } from '../../hooks/use-list-field';
import { resourceCenterTypeConfig, type ResourceCenterUIState } from './resource-center-config';

// Validate block required fields before explicit save. V1 ran this
// inside saveCurrentBlock; moved verbatim. Auto-save doesn't consult
// this — RC validation is only on user-initiated "Save block" /
// "Save tab" clicks, not on every typing keystroke (vs Launcher
// which uses setAutoSaveValidator to also gate auto-save).
const isBlockValid = (block: ResourceCenterBlock): boolean => {
  switch (block.type) {
    case ResourceCenterBlockType.ACTION:
    case ResourceCenterBlockType.SUB_PAGE:
    case ResourceCenterBlockType.CONTENT_LIST:
      return !isRichTextEmpty(block.name);
    case ResourceCenterBlockType.LIVE_CHAT:
      if (isRichTextEmpty(block.name)) {
        return false;
      }
      if (
        block.liveChatProvider === LiveChatProvider.CUSTOM &&
        (block.customLiveChatCode ?? '').trim() === ''
      ) {
        return false;
      }
      return true;
    default:
      return true;
  }
};

const updateTabBlocks = (
  data: ResourceCenterData,
  tabId: string,
  updater: (blocks: ResourceCenterBlock[]) => ResourceCenterBlock[],
): ResourceCenterData => ({
  ...data,
  tabs: data.tabs.map((tab) => (tab.id === tabId ? { ...tab, blocks: updater(tab.blocks) } : tab)),
});

export interface UseResourceCenterEditorReturn {
  data: ResourceCenterData | undefined;
  updateData: (updates: Partial<ResourceCenterData>) => void;
  // Tab ops
  currentTabId: string | null;
  setCurrentTabId: (tabId: string | null) => void;
  addTab: (tab: ResourceCenterTab) => void;
  removeTab: (tabId: string) => void;
  updateTab: (tabId: string, updates: Partial<ResourceCenterTab>) => void;
  reorderTabs: (startIndex: number, endIndex: number) => void;
  editingTab: ResourceCenterTab | null;
  setEditingTab: React.Dispatch<React.SetStateAction<ResourceCenterTab | null>>;
  saveEditingTab: () => void;
  // Block ops (scoped to currentTabId)
  addBlock: (block: ResourceCenterBlock) => void;
  removeBlock: (id: string) => void;
  updateBlock: (id: string, updates: Partial<ResourceCenterBlock>) => void;
  reorderBlocks: (startIndex: number, endIndex: number) => void;
  currentBlock: ResourceCenterBlock | null;
  setCurrentBlock: React.Dispatch<React.SetStateAction<ResourceCenterBlock | null>>;
  saveCurrentBlock: () => void;
  isShowError: boolean;
  isLoading: boolean;
}

export const useResourceCenterEditor = (): UseResourceCenterEditorReturn => {
  const editor = useTypeEditor(resourceCenterTypeConfig);
  const setCurrentMode = useBuilderStore((state) => state.setCurrentMode);

  const data = editor.data;
  const uiState = editor.uiState;
  const setUIState = editor.setUIState;

  // Per-slot UI accessors. Each setter shells out to setUIState with
  // the right partial; same dispatcher pattern as Launcher's two-slot
  // setters, scaled to four slots.
  const setCurrentBlock = useCallback<
    React.Dispatch<React.SetStateAction<ResourceCenterBlock | null>>
  >(
    (value) => {
      setUIState((prev: ResourceCenterUIState) => ({
        ...prev,
        currentBlock:
          typeof value === 'function'
            ? (value as (p: ResourceCenterBlock | null) => ResourceCenterBlock | null)(
                prev.currentBlock,
              )
            : value,
      }));
    },
    [setUIState],
  );
  const setEditingTab = useCallback<React.Dispatch<React.SetStateAction<ResourceCenterTab | null>>>(
    (value) => {
      setUIState((prev: ResourceCenterUIState) => ({
        ...prev,
        editingTab:
          typeof value === 'function'
            ? (value as (p: ResourceCenterTab | null) => ResourceCenterTab | null)(prev.editingTab)
            : value,
      }));
    },
    [setUIState],
  );
  const setCurrentTabId = useCallback(
    (tabId: string | null) => {
      setUIState((prev: ResourceCenterUIState) => ({ ...prev, currentTabId: tabId }));
    },
    [setUIState],
  );
  const setIsShowError = useCallback(
    (next: boolean) => {
      setUIState((prev: ResourceCenterUIState) => ({ ...prev, isShowError: next }));
    },
    [setUIState],
  );

  // Reset error state when switching blocks or tabs — same V1 effect.
  // setIsShowError is ref-stable; the deps are intentionally only
  // the slot ids so the effect fires on selection change only.
  useEffect(() => {
    setIsShowError(false);
  }, [uiState.currentBlock?.id, uiState.editingTab?.id]);

  // Auto-select first tab when data loads and no tab is currently
  // selected — same V1 effect.
  useEffect(() => {
    if (data?.tabs?.length && !uiState.currentTabId) {
      setCurrentTabId(data.tabs[0].id);
    }
  }, [data, uiState.currentTabId, setCurrentTabId]);

  const updateData = editor.updateData;
  const currentTabId = uiState.currentTabId;
  const currentTab = data?.tabs.find((tab) => tab.id === currentTabId) ?? null;

  // Array transforms for tabs (top-level) and the current tab's blocks
  // (nested via updateTabBlocks). Per-op side effects — re-pointing the
  // active tab, validation, mode exit — stay in the wrappers below.
  const tabList = useListField<ResourceCenterTab>({
    items: data?.tabs ?? [],
    setItems: (next) => {
      if (data) {
        updateData({ tabs: next });
      }
    },
  });
  const blockList = useListField<ResourceCenterBlock>({
    items: currentTab?.blocks ?? [],
    setItems: (next) => {
      if (data && currentTabId) {
        updateData(updateTabBlocks(data, currentTabId, () => next));
      }
    },
  });

  // ── Tab operations ─────────────────────────────────────────────────

  const addTab = useCallback(
    (tab: ResourceCenterTab) => {
      if (!data) {
        return;
      }
      tabList.add(tab);
      setCurrentTabId(tab.id);
    },
    [data, tabList.add, setCurrentTabId],
  );

  const removeTab = useCallback(
    (tabId: string) => {
      if (!data) {
        return;
      }
      const newTabs = data.tabs.filter((tab) => tab.id !== tabId);
      updateData({ tabs: newTabs });
      // Re-point currentTabId only when removing the active tab.
      if (currentTabId === tabId) {
        setCurrentTabId(newTabs[0]?.id ?? null);
      }
    },
    [data, currentTabId, updateData, setCurrentTabId],
  );

  const saveEditingTab = useCallback(() => {
    const editingTab = uiState.editingTab;
    if (!editingTab || !data) {
      return;
    }
    if (editingTab.name.trim() === '') {
      setIsShowError(true);
      return;
    }
    setIsShowError(false);
    updateData({
      tabs: data.tabs.map((tab) =>
        tab.id === editingTab.id
          ? {
              ...tab,
              name: editingTab.name,
              iconSource: editingTab.iconSource,
              iconType: editingTab.iconType,
              iconUrl: editingTab.iconUrl,
            }
          : tab,
      ),
    });
    setEditingTab(null);
    setCurrentMode({ mode: BuilderMode.RESOURCE_CENTER });
  }, [uiState.editingTab, data, updateData, setEditingTab, setIsShowError, setCurrentMode]);

  // ── Block operations (scoped to currentTabId via blockList above) ───

  const saveCurrentBlock = useCallback(() => {
    const currentBlock = uiState.currentBlock;
    if (!currentBlock || !currentTabId || !data) {
      return;
    }
    if (!isBlockValid(currentBlock)) {
      setIsShowError(true);
      return;
    }
    setIsShowError(false);
    updateData(
      updateTabBlocks(data, currentTabId, (blocks) =>
        blocks.map((block) => (block.id === currentBlock.id ? currentBlock : block)),
      ),
    );
    setCurrentMode({ mode: BuilderMode.RESOURCE_CENTER });
  }, [uiState.currentBlock, currentTabId, data, updateData, setIsShowError, setCurrentMode]);

  return {
    data,
    updateData,
    currentTabId,
    setCurrentTabId,
    addTab,
    removeTab,
    updateTab: tabList.updateById,
    reorderTabs: tabList.reorder,
    editingTab: uiState.editingTab,
    setEditingTab,
    saveEditingTab,
    addBlock: blockList.add,
    removeBlock: blockList.removeById,
    updateBlock: blockList.updateById,
    reorderBlocks: blockList.reorder,
    currentBlock: uiState.currentBlock,
    setCurrentBlock,
    saveCurrentBlock,
    isShowError: uiState.isShowError,
    isLoading: editor.isLoading,
  };
};
