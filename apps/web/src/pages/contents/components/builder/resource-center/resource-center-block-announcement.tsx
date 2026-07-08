'use client';

import { ResourceCenterBlockType } from '@usertour/types';
import { ResourceCenterBlockEntryPanel } from './resource-center-block-entry-panel';

export const ResourceCenterBlockAnnouncement = () => {
  return (
    <ResourceCenterBlockEntryPanel
      blockType={ResourceCenterBlockType.ANNOUNCEMENT}
      titleKey="contentBuilder.resourceCenter.announcementBlock"
      infoKey="contentBuilder.resourceCenter.announcementInfo"
    />
  );
};

ResourceCenterBlockAnnouncement.displayName = 'ResourceCenterBlockAnnouncement';
