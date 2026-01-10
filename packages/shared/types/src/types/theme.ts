import { RulesCondition } from './config';
import { ThemeTypesSetting } from './theme-settings';

export type ThemeVariation = {
  id: string;
  name: string;
  conditions: RulesCondition[];
  settings: ThemeTypesSetting;
};

export type Theme = {
  id: string;
  name: string;
  updatedAt: string;
  createdAt: string;
  isDefault: boolean;
  isSystem: boolean;
  projectId: string;
  settings: ThemeTypesSetting;
  variations?: ThemeVariation[];
};

export enum ThemeDetailPreviewType {
  TOOLTIP = 'tooltip',
  MODAL = 'modal',
  LAUNCHER_ICON = 'launcher-icon',
  LAUNCHER_BEACON = 'launcher-beacon',
  LAUNCHER_BUTTON = 'launcher-button',
  CHECKLIST = 'checklist',
  CHECKLIST_LAUNCHER = 'checklist-launcher',
  NPS = 'nps',
}

export type ThemeDetailSelectorType = {
  type: ThemeDetailPreviewType;
  name: string;
};
