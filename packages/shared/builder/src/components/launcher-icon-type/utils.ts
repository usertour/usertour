import { LauncherIconSource } from '@usertour/types';
import { IconsList } from '@usertour-packages/sdk';
import { TAB_VALUES } from './constants';

/**
 * Get initial tab based on icon source
 */
export const getInitialTab = (iconSource: LauncherIconSource): string => {
  if (iconSource === LauncherIconSource.UPLOAD) {
    return TAB_VALUES.UPLOAD;
  }
  if (iconSource === LauncherIconSource.URL) {
    return TAB_VALUES.URL;
  }
  return TAB_VALUES.BUILTIN;
};

/**
 * Get active text based on icon source and type
 */
export const getActiveText = (iconSource: LauncherIconSource, iconType: string): string => {
  if (iconSource === LauncherIconSource.UPLOAD) {
    return 'Uploaded icon';
  }
  if (iconSource === LauncherIconSource.URL) {
    return 'URL icon';
  }
  return IconsList.find((item) => item.name === iconType)?.text ?? iconType;
};

/**
 * Get active icon component based on icon type
 */
export const getActiveIcon = (iconType: string) => {
  return IconsList.find((item) => item.name === iconType)?.ICON;
};

/**
 * Validate URL string
 */
export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};
