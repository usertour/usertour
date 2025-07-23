import { AssetAttributes } from '@usertour-packages/frame';
import { BizUserInfo, ThemeTypesSetting } from '@usertour/types';
import { uuidV4 } from '@usertour-packages/utils';
import { getUserTourCss } from '../utils/env';

export const SESSION_TIMEOUT_HOURS = 24 * 2; // 2 days
export const DEFAULT_TARGET_MISSING_SECONDS = 6;

const getAssets = (themeSettings: ThemeTypesSetting): AssetAttributes[] => {
  const { fontFamily } = themeSettings.font;

  const assets: AssetAttributes[] = [
    {
      tagName: 'link',
      isCheckLoaded: true,
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

export { getAssets, createMockUser };
