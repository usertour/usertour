import { type ThemeTypesSetting, defaultSettings, standardDarkSettings } from '@usertour/types';

// Re-export the in-tree presets so tests can pin to whatever the codebase
// considers canonical.
export const defaultsFixture: ThemeTypesSetting = defaultSettings;
export const darkFixture: ThemeTypesSetting = standardDarkSettings;

// Same shape as defaults, but with every optional field populated. Pins the
// schema for fields that defaults/dark leave undefined (otherwise they would
// silently disappear from the snapshot).
export const richFixture: ThemeTypesSetting = {
  ...defaultSettings,
  checklist: {
    ...defaultSettings.checklist,
    zIndex: 9999,
  },
  launcherButtons: {
    ...defaultSettings.launcherButtons,
    width: 200,
  },
  avatar: {
    ...defaultSettings.avatar,
    url: 'https://example.com/avatar.png',
    name: 'rich',
  },
  resourceCenter: {
    ...defaultSettings.resourceCenter!,
    maxHeight: 800,
    zIndex: 9999,
  },
  resourceCenterLauncherButton: {
    ...defaultSettings.resourceCenterLauncherButton!,
    iconUrl: 'https://example.com/icon.svg',
  },
};

export const allFixtures: Record<string, ThemeTypesSetting> = {
  defaults: defaultsFixture,
  dark: darkFixture,
  rich: richFixture,
};
