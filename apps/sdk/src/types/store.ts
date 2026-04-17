import { AssetAttributes } from '@usertour-packages/frame';
import {
  BannerData,
  ChecklistData,
  LauncherData,
  ResourceCenterData,
  ResourceCenterBlockContentItem,
  Step,
  ThemeTypesSetting,
  UserTourTypes,
} from '@usertour/types';

// Base store interface
export interface BaseStore {
  openState: boolean;
  globalStyle: string;
  zIndex: number;
  assets: AssetAttributes[] | undefined;
  userAttributes?: UserTourTypes.Attributes;
  removeBranding: boolean;
  themeSettings: ThemeTypesSetting;
  linkUrlDecorator?: ((url: string) => string) | null;
}

// Tour store type
export type TourStore = BaseStore & {
  triggerRef?: any;
  currentStep: Step | undefined;
  progress: number;
  currentStepIndex?: number; // Current step number (0-based)
  totalSteps?: number; // Total number of steps
};

// Checklist store type
export type ChecklistStore = BaseStore & {
  checklistData?: ChecklistData;
  expanded: boolean;
};

// Launcher store type
export type LauncherStore = BaseStore & {
  launcherData?: LauncherData;
  triggerRef?: any;
};

// Banner store type
export type BannerStore = BaseStore & {
  bannerData?: BannerData;
  targetElement?: Element | null;
};

// Resource Center store type
export type ResourceCenterStore = BaseStore & {
  resourceCenterData?: ResourceCenterData;
  expanded: boolean;
  contentListItems?: ResourceCenterBlockContentItem[];
  /** When true, the RC panel is visually hidden (a live chat provider is active) */
  liveChatActive?: boolean;
  /** Tracks whether the live chat provider widget is currently open */
  liveChatProviderOpen?: boolean;
  /** When true, the default launcher is hidden (set via SDK API) */
  launcherHidden?: boolean;
};
