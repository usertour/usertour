import { AssetAttributes } from '@usertour-packages/frame';
import { ChecklistData, SDKContent, Step, ThemeTypesSetting, UserTourTypes } from '@usertour/types';

// Base store interface
export interface BaseStore {
  openState: boolean;
  globalStyle: string;
  zIndex: number;
  assets: AssetAttributes[] | undefined;
  userAttributes?: UserTourTypes.Attributes;
  removeBranding: boolean;
  themeSettings: ThemeTypesSetting;
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
  // content: SDKContent | undefined;
  checklistData?: ChecklistData;
  expanded: boolean;
};

// Launcher store type
export type LauncherStore = BaseStore & {
  content: SDKContent | undefined;
  triggerRef: HTMLElement | undefined;
};
