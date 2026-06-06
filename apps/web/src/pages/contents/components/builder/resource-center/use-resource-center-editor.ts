import { useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  LiveChatProvider,
  type ResourceCenterBlock,
  ResourceCenterBlockType,
  type ResourceCenterData,
  type ResourceCenterTab,
} from '@usertour/types';
import { isRichTextEmpty } from '@usertour/helpers';
import { useTypeEditor } from '@/pages/contents/components/builder/hooks/use-type-editor';
import { useListField } from '@/pages/contents/components/builder/hooks/use-list-field';
import {
  resourceCenterTypeConfig,
  type ResourceCenterUIState,
} from '@/pages/contents/components/builder/resource-center/resource-center-config';

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
  data: ResourceCenterData;
  updateData: (updates: Partial<ResourceCenterData>) => void;
  // Active tab — sourced from the route (tab/:tabId), null outside the tab
  // routes (e.g. the preview embed beside <Routes>).
  currentTabId: string | null;
  // Tab ops
  addTab: (tab: ResourceCenterTab) => void;
  removeTab: (tabId: string) => void;
  updateTab: (tabId: string, updates: Partial<ResourceCenterTab>) => void;
  reorderTabs: (startIndex: number, endIndex: number) => void;
  editingTab: ResourceCenterTab | null;
  setEditingTab: React.Dispatch<React.SetStateAction<ResourceCenterTab | null>>;
  saveEditingTab: () => void;
  // Block ops (scoped to the route :tabId, except updateBlock — see below)
  startCreateBlock: (type: ResourceCenterBlockType) => void;
  removeBlock: (id: string) => void;
  updateBlock: (id: string, updates: Partial<ResourceCenterBlock>) => void;
  reorderBlocks: (startIndex: number, endIndex: number) => void;
  currentBlock: ResourceCenterBlock | null;
  setCurrentBlock: React.Dispatch<React.SetStateAction<ResourceCenterBlock | null>>;
  saveCurrentBlock: () => void;
  // Sub-view navigation — the descendant router owns which view is open.
  gotoTab: (tabId: string) => void;
  gotoBlock: (blockId: string) => void;
  gotoTabSettings: (tabId: string) => void;
  exitBlock: () => void;
  exitTabSettings: () => void;
  isShowError: boolean;
  isLoading: boolean;
}

export const useResourceCenterEditor = (): UseResourceCenterEditorReturn => {
  const editor = useTypeEditor(resourceCenterTypeConfig);
  const navigate = useNavigate();
  // The route is the source of truth for the active tab (tab/:tabId). undefined
  // when this hook runs outside the tab routes — the preview embed sits beside
  // <Routes> and only needs data + updateBlock, so null is fine there.
  const { tabId } = useParams();
  const currentTabId = tabId ?? null;

  const data = editor.data;
  const uiState = editor.uiState;
  const setUIState = editor.setUIState;

  // Per-slot UI accessors. Each setter shells out to setUIState with
  // the right partial; same dispatcher pattern as Launcher's two-slot
  // setters.
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

  const updateData = editor.updateData;
  const currentTab = data.tabs.find((tab) => tab.id === currentTabId) ?? null;

  // Array transforms for tabs (top-level) and the current tab's blocks
  // (nested via updateTabBlocks). Per-op side effects — validation, view
  // exit — stay in the wrappers below.
  const tabList = useListField<ResourceCenterTab>({
    items: data.tabs,
    setItems: (next) => updateData({ tabs: next }),
  });
  const blockList = useListField<ResourceCenterBlock>({
    items: currentTab?.blocks ?? [],
    setItems: (next) => {
      if (currentTabId) {
        updateData(updateTabBlocks(data, currentTabId, () => next));
      }
    },
  });

  // updateBlock searches ALL tabs by block id rather than scoping to
  // currentTabId: the preview embed edits rich-text / sub-page block content
  // and has no :tabId (it renders beside <Routes>). Block ids are unique
  // across the RC, so a global find-and-update is correct — and it fixes a
  // latent bug where the old currentTabId-scoped update silently no-op'd when
  // the embed's active page belonged to a non-selected tab.
  const updateBlock = useCallback(
    (id: string, updates: Partial<ResourceCenterBlock>) => {
      updateData({
        tabs: data.tabs.map((tab) => ({
          ...tab,
          blocks: tab.blocks.map((block) =>
            block.id === id ? ({ ...block, ...updates } as ResourceCenterBlock) : block,
          ),
        })),
      });
    },
    [data, updateData],
  );

  // ── Sub-view navigation ────────────────────────────────────────────
  // relative: 'path' so '..' counts URL segments under the RC base
  // (.../tab/:tabId{,/settings,/block/:blockId}), independent of how the
  // routes nest.
  const gotoTab = useCallback(
    (id: string) => {
      navigate(`../${id}`, { relative: 'path' });
    },
    [navigate],
  );
  const gotoBlock = useCallback(
    (id: string) => {
      navigate(`block/${id}`, { relative: 'path' });
    },
    [navigate],
  );
  // Add block → open the new-block sub-view (block/new?type=). The block only
  // lands in the tab on save, mirroring flow's "Add step → step/new → save".
  const startCreateBlock = useCallback(
    (type: ResourceCenterBlockType) => {
      navigate(`block/new?type=${type}`, { relative: 'path' });
    },
    [navigate],
  );
  const gotoTabSettings = useCallback(
    (id: string) => {
      navigate(`../${id}/settings`, { relative: 'path' });
    },
    [navigate],
  );
  const exitBlock = useCallback(() => {
    navigate('../..', { relative: 'path' });
  }, [navigate]);
  const exitTabSettings = useCallback(() => {
    navigate('..', { relative: 'path' });
  }, [navigate]);

  // ── Tab operations ─────────────────────────────────────────────────

  const addTab = useCallback(
    (tab: ResourceCenterTab) => {
      tabList.add(tab);
    },
    [tabList.add],
  );

  const removeTab = useCallback(
    (id: string) => {
      const newTabs = data.tabs.filter((tab) => tab.id !== id);
      updateData({ tabs: newTabs });
      // Removing the active (route) tab — move to the first remaining tab.
      if (currentTabId === id && newTabs[0]) {
        navigate(`../${newTabs[0].id}`, { relative: 'path' });
      }
    },
    [data, currentTabId, updateData, navigate],
  );

  const saveEditingTab = useCallback(() => {
    const editingTab = uiState.editingTab;
    if (!editingTab) {
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
    exitTabSettings();
  }, [uiState.editingTab, data, updateData, setEditingTab, setIsShowError, exitTabSettings]);

  // ── Block operations (scoped to the route :tabId via blockList above) ──

  const saveCurrentBlock = useCallback(() => {
    const currentBlock = uiState.currentBlock;
    if (!currentBlock || !currentTabId) {
      return;
    }
    if (!isBlockValid(currentBlock)) {
      setIsShowError(true);
      return;
    }
    setIsShowError(false);
    // Update in place if the block id already exists in the tab, otherwise
    // append — the new-block sub-view only commits here on save.
    updateData(
      updateTabBlocks(data, currentTabId, (blocks) =>
        blocks.some((block) => block.id === currentBlock.id)
          ? blocks.map((block) => (block.id === currentBlock.id ? currentBlock : block))
          : [...blocks, currentBlock],
      ),
    );
    exitBlock();
  }, [uiState.currentBlock, currentTabId, data, updateData, setIsShowError, exitBlock]);

  return {
    data,
    updateData,
    currentTabId,
    addTab,
    removeTab,
    updateTab: tabList.updateById,
    reorderTabs: tabList.reorder,
    editingTab: uiState.editingTab,
    setEditingTab,
    saveEditingTab,
    startCreateBlock,
    removeBlock: blockList.removeById,
    updateBlock,
    reorderBlocks: blockList.reorder,
    currentBlock: uiState.currentBlock,
    setCurrentBlock,
    saveCurrentBlock,
    gotoTab,
    gotoBlock,
    gotoTabSettings,
    exitBlock,
    exitTabSettings,
    isShowError: uiState.isShowError,
    isLoading: editor.isLoading,
  };
};
