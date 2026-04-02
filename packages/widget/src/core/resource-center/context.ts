import { createContext, useContext } from 'react';
import type {
  ResourceCenterData,
  ResourceCenterKnowledgeBaseBlock,
  ResourceCenterSubPageBlock,
  ThemeTypesSetting,
  UserTourTypes,
} from '@usertour/types';

export interface ResourceCenterContextValue {
  globalStyle: string;
  themeSetting: ThemeTypesSetting;
  data: ResourceCenterData;
  launcherText?: string;
  badgeCount: number;
  uncompletedCount: number;
  isOpen: boolean;
  isAnimating: boolean;
  animateFrame: boolean;
  handleExpandedChange: (expanded: boolean) => Promise<void>;
  zIndex: number;
  userAttributes?: UserTourTypes.Attributes;
  onContentClick?: (element: any) => Promise<void>;
  onBlockClick?: (blockId: string) => Promise<void>;
  checklistSlot?: React.ReactNode;
  showMadeWith: boolean;
  activeSubPage: ResourceCenterSubPageBlock | null;
  navigateToSubPage: (block: ResourceCenterSubPageBlock) => void;
  activeKnowledgeBase: ResourceCenterKnowledgeBaseBlock | null;
  navigateToKnowledgeBase: (block: ResourceCenterKnowledgeBaseBlock) => void;
  navigateBack: () => void;
}

export const ResourceCenterRootContext = createContext<ResourceCenterContextValue | null>(null);

export const useResourceCenterContext = () => {
  const context = useContext(ResourceCenterRootContext);
  if (!context) {
    throw new Error('useResourceCenterContext must be used within a ResourceCenterRoot.');
  }
  return context;
};
