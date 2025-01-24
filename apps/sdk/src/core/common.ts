import { AssetAttributes } from "@usertour-ui/frame";
import { BizUserInfo, Theme } from "@usertour-ui/types";
import { uuidV4 } from "@usertour-ui/ui-utils";
import { TourStore, ChecklistStore, LauncherStore } from "../types/store";

const defaultAssets: AssetAttributes[] = [
  {
    tagName: "link",
    isCheckLoaded: false,
    href: USERTOUR_APP_USER_TOUR_CSS,
    rel: "stylesheet",
    type: "text/css",
  },
];

const DEFAULT_Z_INDEX = 11111;
const DEFAULT_STORE_VALUES = {
  openState: false,
  globalStyle: "",
  assets: [...defaultAssets],
  userInfo: undefined,
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

  if (fontFamily === "System font" || fontFamily === "Custom font") {
    return [...defaultAssets];
  }

  return [
    ...defaultAssets,
    {
      tagName: "link",
      isCheckLoaded: false,
      href: `https://fonts.googleapis.com/css2?family=${fontFamily}`,
      rel: "stylesheet",
      type: "text/css",
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
      registerAt: "2024-03-29T16:05:45.000Z",
      userNamedddd: "usertour-test",
    },
  };
};

const UserTourAsset: AssetAttributes = {
  tagName: "link",
  isCheckLoaded: false,
  href: USERTOUR_APP_USER_TOUR_CSS,
  rel: "stylesheet",
  type: "text/css",
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

export {
  defaultTourStore,
  defaultChecklistStore,
  defaultLauncherStore,
  UserTourAsset,
  getAssets,
  createMockUser,
};
