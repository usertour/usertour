'use client';

import { ResourceCenterBlockType } from '@usertour/types';
import { ResourceCenterBlockEntryPanel } from './resource-center-block-entry-panel';

export const ResourceCenterBlockSubPage = () => {
  return (
    <ResourceCenterBlockEntryPanel
      blockType={ResourceCenterBlockType.SUB_PAGE}
      titleKey="contentBuilder.resourceCenter.subPageBlock"
      infoKey="contentBuilder.resourceCenter.subPageInfo"
    />
  );
};

ResourceCenterBlockSubPage.displayName = 'ResourceCenterBlockSubPage';
