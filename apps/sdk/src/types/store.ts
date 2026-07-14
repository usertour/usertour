import { AssetAttributes } from '@usertour/frame';
import {
  BannerData,
  ChecklistData,
  LauncherData,
  ResourceCenterData,
  ResourceCenterBlockContentItem,
  ResourceCenterNavigationState,
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
  /** Drives the widget chrome translations; falls back to the browser locale. */
  userLocale?: string;
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
  /**
   * Navigation state (active tab + page stack) loaded from storage at mount
   * time. Read once by the widget via useState initializer so subsequent
   * storage writes (driven by user interaction) do not overwrite live state.
   */
  initialNav?: ResourceCenterNavigationState | null;
  contentListItems?: ResourceCenterBlockContentItem[];
  /** Content-list fetch in flight (drives the loading state + retry feedback). */
  contentListLoading?: boolean;
  /** Content-list fetch failed (timeout / dropped socket) — render a retry, not "No items". */
  contentListError?: boolean;
  /** When true, the RC panel is visually hidden (a live chat provider is active) */
  liveChatActive?: boolean;
  /** Tracks whether the live chat provider widget is currently open */
  liveChatProviderOpen?: boolean;
  /** When true, the default launcher is hidden (set via SDK API) */
  launcherHidden?: boolean;
};
