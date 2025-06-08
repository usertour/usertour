import { AssetAttributes } from '@usertour-ui/frame';
import { BizUserInfo, PlanType, Theme } from '@usertour-ui/types';
import { uuidV4 } from '@usertour-ui/ui-utils';
import { ChecklistStore, LauncherStore, TourStore } from '../types/store';
import { getUserTourCss } from '../utils/env';

const DEFAULT_Z_INDEX = 11111;
export const SESSION_TIMEOUT_HOURS = 24 * 2; // 2 days
export const DEFAULT_TARGET_MISSING_SECONDS = 6;

const DEFAULT_STORE_VALUES = {
  openState: false,
  globalStyle: '',
  assets: [],
  userInfo: undefined,
  sdkConfig: {
    removeBranding: false,
    planType: PlanType.HOBBY,
  },
};

// Update default stores
const defaultTourStore: TourStore = {
  ...DEFAULT_STORE_VALUES,
  zIndex: DEFAULT_Z_INDEX,
  currentStep: undefined,
  progress: 0,
};

const getAssets = (theme: Theme): AssetAttributes[] => {
  const { fontFamily } = theme.settings.font;

  const assets: AssetAttributes[] = [
    {
      tagName: 'link',
      isCheckLoaded: false,
      href: getUserTourCss(),
      rel: 'stylesheet',
      type: 'text/css',
    },
  ];
  if (fontFamily === 'System font' || fontFamily === 'Custom font') {
    return [...assets];
  }

  return [
    ...assets,
    {
      tagName: 'link',
      isCheckLoaded: false,
      href: `https://fonts.googleapis.com/css2?family=${fontFamily}`,
      rel: 'stylesheet',
      type: 'text/css',
    },
  ];
};

const createMockUser = (userId?: string): BizUserInfo => {
  const now = new Date().toISOString();
  return {
    externalId: userId ?? uuidV4(),
    id: uuidV4(),
    createdAt: now,
    updatedAt: now,
    bizCompanyId: uuidV4(),
    deleted: false,
    data: {
      male: true,
      sdsdd: 13,
      registerAt: '2024-03-29T16:05:45.000Z',
      userNamedddd: 'usertour-test',
    },
  };
};

const defaultChecklistStore: ChecklistStore = {
  ...DEFAULT_STORE_VALUES,
  zIndex: 1000000,
  content: undefined,
  theme: undefined,
};

const defaultLauncherStore: LauncherStore = {
  ...DEFAULT_STORE_VALUES,
  zIndex: 11111,
  content: undefined,
  triggerRef: undefined,
};

export { defaultTourStore, defaultChecklistStore, defaultLauncherStore, getAssets, createMockUser };
