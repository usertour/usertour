import { ThemeTypesSetting } from './theme-settings';

export type Theme = {
  id: string;
  name: string;
  updatedAt: string;
  createdAt: string;
  isDefault: boolean;
  isSystem: boolean;
  projectId: string;
  settings: ThemeTypesSetting;
};

export enum ThemeDetailPreviewType {
  TOOLTIP = 'tooltip',
  MODAL = 'modal',
  LAUNCHER_ICON = 'launcher-icon',
  LAUNCHER_BEACON = 'launcher-beacon',
  CHECKLIST = 'checklist',
  CHECKLIST_LAUNCHER = 'checklist-launcher',
  NPS = 'nps',
}

export type ThemeDetailSelectorType = {
  type: ThemeDetailPreviewType;
  name: string;
};
