import type { ElementType } from 'react';
import {
  RiArrowRightCircleFill,
  RiBookOpenFill,
  RiCheckboxCircleFill,
  RiFileTextFill,
  RiFlashlightFill,
  RiListCheck3,
  RiMailFill,
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
  [ResourceCenterBlockType.MESSAGE]: 'Message',
  [ResourceCenterBlockType.DIVIDER]: 'Divider line',
  [ResourceCenterBlockType.SUB_PAGE]: 'Sub-page',
  [ResourceCenterBlockType.CONTACT]: 'Contact',
  [ResourceCenterBlockType.CONTENT_LIST]: 'List of flows/checklists',
  [ResourceCenterBlockType.AI_ASSISTANT]: 'AI Assistant',
  [ResourceCenterBlockType.ANNOUNCEMENTS]: 'Announcements',
  [ResourceCenterBlockType.KNOWLEDGE_BASE]: 'Knowledge base',
  [ResourceCenterBlockType.CHECKLIST]: 'Checklist',
};

export const BLOCK_TYPE_OPTIONS: BlockTypeOption[] = [
  {
    key: ResourceCenterBlockType.ACTION,
    value: ResourceCenterBlockType.ACTION,
    label: 'Action',
    description: 'Link, Start flow, Custom JS',
    icon: RiArrowRightCircleFill,
  },
  {
    key: ResourceCenterBlockType.MESSAGE,
    value: ResourceCenterBlockType.MESSAGE,
    label: 'Message',
    description: 'Announcement, General info',
    icon: RiFileTextFill,
  },
  {
    key: ResourceCenterBlockType.SUB_PAGE,
    value: ResourceCenterBlockType.SUB_PAGE,
    label: 'Sub-page',
    description: 'Nested route with free-form content',
    icon: RiPagesFill,
  },
  {
    key: ResourceCenterBlockType.CONTACT,
    value: ResourceCenterBlockType.CONTACT,
    label: 'Contact',
    description: 'Email, Phone, Live-chat',
    icon: RiMailFill,
  },
  {
    key: ResourceCenterBlockType.CONTENT_LIST,
    value: ResourceCenterBlockType.CONTENT_LIST,
    label: 'List of flows/checklists',
    description: 'Start on demand',
    icon: RiListCheck3,
  },
  {
    key: ResourceCenterBlockType.CHECKLIST,
    value: ResourceCenterBlockType.CHECKLIST,
    label: 'Checklist',
    description: 'Embed an active checklist',
    icon: RiCheckboxCircleFill,
  },
  {
    key: ResourceCenterBlockType.AI_ASSISTANT,
    value: ResourceCenterBlockType.AI_ASSISTANT,
    label: 'Adoption Agent',
    description: 'Instant answers from Adoption agent',
    icon: RiFlashlightFill,
    disabled: true,
  },
  {
    key: ResourceCenterBlockType.KNOWLEDGE_BASE,
    value: ResourceCenterBlockType.KNOWLEDGE_BASE,
    label: 'Knowledge base',
    description: 'Search help articles',
    icon: RiBookOpenFill,
  },
  {
    key: ResourceCenterBlockType.DIVIDER,
    value: ResourceCenterBlockType.DIVIDER,
    label: 'Divider line',
    description: 'Used to visually separate sections',
    icon: RiSeparator,
  },
];

export const getResourceCenterBlockTypeIcon = (type: ResourceCenterBlockType) => {
  return BLOCK_TYPE_OPTIONS.find((option) => option.value === type)?.icon;
};
