import type { ElementType } from 'react';
import {
  RiArrowRightCircleFill,
  RiFileTextFill,
  RiListCheck3,
  RiMessage3Fill,
  RiSendInsFill,
  RiPagesFill,
  RiSeparator,
} from '@usertour-packages/icons';
import { ResourceCenterBlockType } from '@usertour/types';

type IconComponent = ElementType<{ className?: string; width?: number; height?: number }>;

export type BlockTypeOption = {
  key: string;
  value?: ResourceCenterBlockType;
  label: string;
  description: string;
  icon: IconComponent;
  disabled?: boolean;
};

export const BLOCK_TYPE_LABELS: Record<ResourceCenterBlockType, string> = {
  [ResourceCenterBlockType.ACTION]: 'Action',
  [ResourceCenterBlockType.RICH_TEXT]: 'Rich Text',
  [ResourceCenterBlockType.DIVIDER]: 'Divider line',
  [ResourceCenterBlockType.SUB_PAGE]: 'Sub-page',
  [ResourceCenterBlockType.CONTENT_LIST]: 'List of flows/checklists',
  [ResourceCenterBlockType.KNOWLEDGE_BASE]: 'Knowledge base',
  [ResourceCenterBlockType.LIVE_CHAT]: 'Live chat',
  [ResourceCenterBlockType.ANNOUNCEMENT]: 'Announcements',
};

export const BLOCK_TYPE_OPTIONS: BlockTypeOption[] = [
  {
    key: ResourceCenterBlockType.ACTION,
    value: ResourceCenterBlockType.ACTION,
    label: 'Action',
    description: 'Link, start flow, or custom code',
    icon: RiArrowRightCircleFill,
  },
  {
    key: ResourceCenterBlockType.RICH_TEXT,
    value: ResourceCenterBlockType.RICH_TEXT,
    label: 'Rich Text',
    description: 'Add text, images, and more',
    icon: RiFileTextFill,
  },
  {
    key: ResourceCenterBlockType.SUB_PAGE,
    value: ResourceCenterBlockType.SUB_PAGE,
    label: 'Sub-page',
    description: 'A separate page with its own content',
    icon: RiPagesFill,
  },
  {
    key: ResourceCenterBlockType.CONTENT_LIST,
    value: ResourceCenterBlockType.CONTENT_LIST,
    label: 'List of flows/checklists',
    description: 'Start content on demand',
    icon: RiListCheck3,
  },
  {
    key: ResourceCenterBlockType.LIVE_CHAT,
    value: ResourceCenterBlockType.LIVE_CHAT,
    label: 'Live chat',
    description: 'Connect to your live chat provider',
    icon: RiMessage3Fill,
  },
  {
    key: ResourceCenterBlockType.ANNOUNCEMENT,
    value: ResourceCenterBlockType.ANNOUNCEMENT,
    label: 'Announcements',
    description: 'Share product updates and news',
    icon: RiSendInsFill,
  },
  {
    key: ResourceCenterBlockType.DIVIDER,
    value: ResourceCenterBlockType.DIVIDER,
    label: 'Divider line',
    description: 'A visual separator between blocks',
    icon: RiSeparator,
  },
];

export const getResourceCenterBlockTypeIcon = (type: ResourceCenterBlockType) => {
  return BLOCK_TYPE_OPTIONS.find((option) => option.value === type)?.icon;
};
