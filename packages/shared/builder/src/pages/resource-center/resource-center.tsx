import { BuilderMode, useBuilderContext } from '../../contexts';
import { useAutoSidebarPosition } from '../../hooks/use-auto-sidebar-position';
import { ResourceCenterCore } from './resource-center-core';
import { ResourceCenterBlockMessage } from './resource-center-block-message';
import { ResourceCenterBlockChecklist } from './resource-center-block-checklist';
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
      {currentMode?.mode === BuilderMode.RESOURCE_CENTER_BLOCK &&
        currentBlock?.type === ResourceCenterBlockType.MESSAGE && <ResourceCenterBlockMessage />}
      {currentMode?.mode === BuilderMode.RESOURCE_CENTER_BLOCK &&
        currentBlock?.type === ResourceCenterBlockType.CHECKLIST && (
          <ResourceCenterBlockChecklist />
        )}
      <ResourceCenterEmbed />
    </>
  );
};

ResourceCenterBuilder.displayName = 'ResourceCenterBuilder';
