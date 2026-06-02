import { useLayoutEffect } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import {
  type ResourceCenterBlock,
  ResourceCenterBlockType,
  type ResourceCenterData,
} from '@usertour/types';
import { useBuilderStore } from '../../core';
import { useAutoSidebarPosition } from '../../hooks/use-auto-sidebar-position';
import { ResourceCenterCore } from './resource-center-core';
import { ResourceCenterBlockRichText } from './resource-center-block-rich-text';
import { ResourceCenterBlockDivider } from './resource-center-block-divider';
import { ResourceCenterBlockAction } from './resource-center-block-action';
import { ResourceCenterBlockSubPage } from './resource-center-block-sub-page';
import { ResourceCenterBlockContentList } from './resource-center-block-content-list';
import { ResourceCenterBlockLiveChat } from './resource-center-block-live-chat';
import { ResourceCenterTabSettings } from './resource-center-tab-settings';
import { ResourceCenterEmbed } from './components/resource-center-embed';
import { useResourceCenterEditor } from './use-resource-center-editor';

// index → redirect to the first tab. The RC always opens on a tab; tab/:tabId
// is the source of truth for the active tab (replacing uiState.currentTabId).
const RedirectToFirstTab = () => {
  const data = useBuilderStore((state) => state.currentVersion?.data) as
    | ResourceCenterData
    | undefined;
  const firstTabId = data?.tabs?.[0]?.id;
  if (!firstTabId) {
    return null;
  }
  return <Navigate to={`tab/${firstTabId}`} replace relative="path" />;
};

// tab/:tabId/block/:blockId — seed the currentBlock draft from the route (find
// the block in that tab + deep-clone so the buffer is independent of the
// model), then dispatch on block type. Layout effect so the first paint
// already has the buffer; the block editors gate on currentBlock.
const ResourceCenterBlockEditor = () => {
  const { tabId, blockId } = useParams();
  const { data, setCurrentBlock } = useResourceCenterEditor();
  const block = data?.tabs.find((t) => t.id === tabId)?.blocks.find((b) => b.id === blockId);
  // Seed the editable currentBlock buffer (deep-clone, independent of the
  // model) on route change. dispatch is on the MODEL block's type — immediate
  // and correct even before the buffer seeds; each editor body gates on
  // currentBlock.type, so the pre-seed frame renders nothing, never a stale block.
  useLayoutEffect(() => {
    setCurrentBlock(block ? (JSON.parse(JSON.stringify(block)) as ResourceCenterBlock) : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabId, blockId]);

  switch (block?.type) {
    case ResourceCenterBlockType.RICH_TEXT:
      return <ResourceCenterBlockRichText />;
    case ResourceCenterBlockType.DIVIDER:
      return <ResourceCenterBlockDivider />;
    case ResourceCenterBlockType.ACTION:
      return <ResourceCenterBlockAction />;
    case ResourceCenterBlockType.SUB_PAGE:
      return <ResourceCenterBlockSubPage />;
    case ResourceCenterBlockType.CONTENT_LIST:
      return <ResourceCenterBlockContentList />;
    case ResourceCenterBlockType.LIVE_CHAT:
      return <ResourceCenterBlockLiveChat />;
    default:
      return null;
  }
};

// The ResourceCenter builder — a descendant <Routes> under the builder
// route's /* routing its sub-views. tab/:tabId is the source of truth for the
// active tab; settings / block are scoped under it. The preview embed sits
// OUTSIDE <Routes> so it stays mounted across sub-view switches.
export const ResourceCenterBuilder = () => {
  useAutoSidebarPosition();
  return (
    <>
      <Routes>
        <Route index element={<RedirectToFirstTab />} />
        <Route path="tab/:tabId" element={<ResourceCenterCore />} />
        <Route path="tab/:tabId/settings" element={<ResourceCenterTabSettings />} />
        <Route path="tab/:tabId/block/:blockId" element={<ResourceCenterBlockEditor />} />
      </Routes>
      <ResourceCenterEmbed />
    </>
  );
};

ResourceCenterBuilder.displayName = 'ResourceCenterBuilder';
