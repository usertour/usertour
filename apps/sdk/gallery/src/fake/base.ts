import { WidgetZIndex } from '@usertour/constants';
import type { ThemeTypesSetting } from '@usertour/types';
import { UsertourTheme } from '@/core/usertour-theme';
import type { BaseStore } from '@/types/store';

/** The z-index UsertourComponent.getBaseZIndex() yields without a custom base. */
export const BASE_Z_INDEX = WidgetZIndex.BASE;

/**
 * buildBaseStoreData as UsertourComponent does it (theme data via
 * UsertourTheme, no branding removal, en-US chrome), already opened.
 */
export const buildBaseSnapshot = (theme: ThemeTypesSetting, zIndex: number): BaseStore => ({
  ...UsertourTheme.createThemeData(theme),
  openState: true,
  zIndex,
  userAttributes: {},
  removeBranding: false,
  userLocale: 'en-US',
  linkUrlDecorator: null,
});
