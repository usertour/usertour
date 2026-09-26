import { defaultSettings, standardDarkSettings } from '@usertour/constants';
import type { ThemeTypesSetting } from '@usertour/types';

/** Themes selectable with `?theme=<name>`; `default` is what a fresh project starts with. */
export const themes: Record<string, ThemeTypesSetting> = {
  default: defaultSettings,
  dark: standardDarkSettings,
};
