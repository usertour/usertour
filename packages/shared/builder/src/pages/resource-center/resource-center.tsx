import { BuilderMode, useBuilderContext } from '../../contexts';
import { useAutoSidebarPosition } from '../../hooks/use-auto-sidebar-position';
import { ResourceCenterCore } from './resource-center-core';
import { ResourceCenterBlockRichText } from './resource-center-block-rich-text';
import { ResourceCenterBlockDivider } from './resource-center-block-divider';
import { ResourceCenterBlockAction } from './resource-center-block-action';
import { ResourceCenterBlockSubPage } from './resource-center-block-sub-page';
import { ResourceCenterBlockKnowledgeBase } from './resource-center-block-knowledge-base';
import { ResourceCenterBlockContentList } from './resource-center-block-content-list';
import { ResourceCenterBlockLiveChat } from './resource-center-block-live-chat';
import { ResourceCenterTabSettings } from './resource-center-tab-settings';
import { ResourceCenterEmbed } from './components/resource-center-embed';
import { useResourceCenterContext } from '../../contexts';
import { ResourceCenterBlockType } from '@usertour/types';

export const ResourceCenterBuilder = () => {
  const { currentMode } = useBuilderContext();
  const { currentBlock } = useResourceCenterContext();

  useAutoSidebarPosition();

  return (
    <>
      {currentMode?.mode === BuilderMode.RESOURCE_CENTER && <ResourceCenterCore />}
      {currentMode?.mode === BuilderMode.RESOURCE_CENTER_TAB && <ResourceCenterTabSettings />}
      {currentMode?.mode === BuilderMode.RESOURCE_CENTER_BLOCK &&
        currentBlock?.type === ResourceCenterBlockType.RICH_TEXT && <ResourceCenterBlockRichText />}
      {currentMode?.mode === BuilderMode.RESOURCE_CENTER_BLOCK &&
        currentBlock?.type === ResourceCenterBlockType.DIVIDER && <ResourceCenterBlockDivider />}
      {currentMode?.mode === BuilderMode.RESOURCE_CENTER_BLOCK &&
        currentBlock?.type === ResourceCenterBlockType.ACTION && <ResourceCenterBlockAction />}
      {currentMode?.mode === BuilderMode.RESOURCE_CENTER_BLOCK &&
        currentBlock?.type === ResourceCenterBlockType.SUB_PAGE && <ResourceCenterBlockSubPage />}
      {currentMode?.mode === BuilderMode.RESOURCE_CENTER_BLOCK &&
        currentBlock?.type === ResourceCenterBlockType.KNOWLEDGE_BASE && (
          <ResourceCenterBlockKnowledgeBase />
        )}
      {currentMode?.mode === BuilderMode.RESOURCE_CENTER_BLOCK &&
        currentBlock?.type === ResourceCenterBlockType.CONTENT_LIST && (
          <ResourceCenterBlockContentList />
        )}
      {currentMode?.mode === BuilderMode.RESOURCE_CENTER_BLOCK &&
        currentBlock?.type === ResourceCenterBlockType.LIVE_CHAT && <ResourceCenterBlockLiveChat />}
      <ResourceCenterEmbed />
    </>
  );
};

ResourceCenterBuilder.displayName = 'ResourceCenterBuilder';
