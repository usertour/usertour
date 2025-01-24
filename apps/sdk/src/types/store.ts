import { AssetAttributes } from "@usertour-ui/frame";
import {
  BizUserInfo,
  SDKContent,
  Step,
  Theme,
  ThemeTypesSetting,
} from "@usertour-ui/types";

// Base store interface
export interface BaseStore {
  openState: boolean;
  globalStyle: string;
  zIndex: number;
  assets: AssetAttributes[] | undefined;
  userInfo: BizUserInfo | undefined;
  theme?: Theme;
}

// Tour store type
export type TourStore = BaseStore & {
  triggerRef?: any;
  currentStep: Step | undefined;
  progress: number;
};

// Checklist store type
export type ChecklistStore = BaseStore & {
  content: SDKContent | undefined;
};

// Launcher store type
export type LauncherStore = BaseStore & {
  content: SDKContent | undefined;
  triggerRef: HTMLElement | undefined;
};
