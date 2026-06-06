import { useLayoutEffect } from 'react';
import { Navigate, Route, Routes, useParams, useSearchParams } from 'react-router-dom';
import {
  type ResourceCenterBlock,
  ResourceCenterBlockType,
  type ResourceCenterData,
} from '@usertour/types';
import { useBuilderStore } from '@/pages/contents/components/builder/core';
import { useAutoSidebarPosition } from '@/pages/contents/components/builder/hooks/use-auto-sidebar-position';
import { ResourceCenterMainView } from '@/pages/contents/components/builder/resource-center/resource-center-main-view';
import { ResourceCenterBlockRichText } from '@/pages/contents/components/builder/resource-center/resource-center-block-rich-text';
import { ResourceCenterBlockDivider } from '@/pages/contents/components/builder/resource-center/resource-center-block-divider';
import { ResourceCenterBlockAction } from '@/pages/contents/components/builder/resource-center/resource-center-block-action';
import { ResourceCenterBlockSubPage } from '@/pages/contents/components/builder/resource-center/resource-center-block-sub-page';
import { ResourceCenterBlockContentList } from '@/pages/contents/components/builder/resource-center/resource-center-block-content-list';
import { ResourceCenterBlockLiveChat } from '@/pages/contents/components/builder/resource-center/resource-center-block-live-chat';
import { ResourceCenterTabSettings } from '@/pages/contents/components/builder/resource-center/resource-center-tab-settings';
import { ResourceCenterEmbed } from '@/pages/contents/components/builder/resource-center/components/resource-center-embed';
import { useResourceCenterEditor } from '@/pages/contents/components/builder/resource-center/use-resource-center-editor';
import { createDefaultBlock } from '@/pages/contents/components/builder/resource-center/create-default-block';

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
  const [searchParams] = useSearchParams();
  const { data, setCurrentBlock } = useResourceCenterEditor();
  // block/:blockId → edit an existing block; block/new?type= → a fresh draft
  // that only lands in the tab on save.
  const newType = searchParams.get('type') as ResourceCenterBlockType | null;
  const existingBlock = blockId
    ? data.tabs.find((t) => t.id === tabId)?.blocks.find((b) => b.id === blockId)
    : undefined;
  // Seed the editable currentBlock buffer on route change: a deep clone for
  // edit (independent of the model), a fresh default for new. Dispatch (below)
  // is on the resolved type, so the pre-seed frame renders the right editor.
  useLayoutEffect(() => {
    if (blockId) {
      setCurrentBlock(
        existingBlock ? (JSON.parse(JSON.stringify(existingBlock)) as ResourceCenterBlock) : null,
      );
    } else if (newType) {
      setCurrentBlock(createDefaultBlock(newType));
    } else {
      setCurrentBlock(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabId, blockId, newType]);

  // The block id in the URL points at a block that no longer exists (just
  // deleted, or a stale deep-link / refresh) — bounce back to the tab instead
  // of rendering a blank editor.
  if (blockId && !existingBlock) {
    return <Navigate to="../.." relative="path" replace />;
  }

  const dispatchType = blockId ? existingBlock?.type : (newType ?? undefined);
  switch (dispatchType) {
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
        <Route path="tab/:tabId" element={<ResourceCenterMainView />} />
        <Route path="tab/:tabId/settings" element={<ResourceCenterTabSettings />} />
        <Route path="tab/:tabId/block/new" element={<ResourceCenterBlockEditor />} />
        <Route path="tab/:tabId/block/:blockId" element={<ResourceCenterBlockEditor />} />
      </Routes>
      <ResourceCenterEmbed />
    </>
  );
};

ResourceCenterBuilder.displayName = 'ResourceCenterBuilder';
