import type { ElementType } from 'react';
import {
  RiArrowRightCircleLine,
  RiFileTextLine,
  RiListCheck3,
  RiMessage3Line,
  RiPagesLine,
  RiSeparator,
} from '@usertour/icons';
import { ResourceCenterBlockType } from '@usertour/types';

type IconComponent = ElementType<{ className?: string; width?: number; height?: number }>;

// `label` / `description` are i18n keys (under contentBuilder.resourceCenter.blockType.*);
// callers resolve them with t().
export type BlockTypeOption = {
  key: string;
  value?: ResourceCenterBlockType;
  label: string;
  description: string;
  icon: IconComponent;
  disabled?: boolean;
};

export const BLOCK_TYPE_LABELS: Record<ResourceCenterBlockType, string> = {
  [ResourceCenterBlockType.ACTION]: 'contentBuilder.resourceCenter.blockType.action.label',
  [ResourceCenterBlockType.RICH_TEXT]: 'contentBuilder.resourceCenter.blockType.richText.label',
  [ResourceCenterBlockType.DIVIDER]: 'contentBuilder.resourceCenter.blockType.divider.label',
  [ResourceCenterBlockType.SUB_PAGE]: 'contentBuilder.resourceCenter.blockType.subPage.label',
  [ResourceCenterBlockType.CONTENT_LIST]:
    'contentBuilder.resourceCenter.blockType.contentList.label',
  [ResourceCenterBlockType.LIVE_CHAT]: 'contentBuilder.resourceCenter.blockType.liveChat.label',
};

export const BLOCK_TYPE_OPTIONS: BlockTypeOption[] = [
  {
    key: ResourceCenterBlockType.ACTION,
    value: ResourceCenterBlockType.ACTION,
    label: 'contentBuilder.resourceCenter.blockType.action.label',
    description: 'contentBuilder.resourceCenter.blockType.action.description',
    icon: RiArrowRightCircleLine,
  },
  {
    key: ResourceCenterBlockType.RICH_TEXT,
    value: ResourceCenterBlockType.RICH_TEXT,
    label: 'contentBuilder.resourceCenter.blockType.richText.label',
    description: 'contentBuilder.resourceCenter.blockType.richText.description',
    icon: RiFileTextLine,
  },
  {
    key: ResourceCenterBlockType.SUB_PAGE,
    value: ResourceCenterBlockType.SUB_PAGE,
    label: 'contentBuilder.resourceCenter.blockType.subPage.label',
    description: 'contentBuilder.resourceCenter.blockType.subPage.description',
    icon: RiPagesLine,
  },
  {
    key: ResourceCenterBlockType.CONTENT_LIST,
    value: ResourceCenterBlockType.CONTENT_LIST,
    label: 'contentBuilder.resourceCenter.blockType.contentList.label',
    description: 'contentBuilder.resourceCenter.blockType.contentList.description',
    icon: RiListCheck3,
  },
  {
    key: ResourceCenterBlockType.LIVE_CHAT,
    value: ResourceCenterBlockType.LIVE_CHAT,
    label: 'contentBuilder.resourceCenter.blockType.liveChat.label',
    description: 'contentBuilder.resourceCenter.blockType.liveChat.description',
    icon: RiMessage3Line,
  },
  {
    key: ResourceCenterBlockType.DIVIDER,
    value: ResourceCenterBlockType.DIVIDER,
    label: 'contentBuilder.resourceCenter.blockType.divider.label',
    description: 'contentBuilder.resourceCenter.blockType.divider.description',
    icon: RiSeparator,
  },
];

export const getResourceCenterBlockTypeIcon = (type: ResourceCenterBlockType) => {
  return BLOCK_TYPE_OPTIONS.find((option) => option.value === type)?.icon;
};
