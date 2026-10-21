import { RulesCondition } from './config';
import { ThemeTypesSetting } from './theme-settings';

export type ThemeVariation = {
  id: string;
  name: string;
  conditions: RulesCondition[];
  settings: ThemeTypesSetting;
};

/**
 * A theme as the runtime receives it: the config payload's theme list and the
 * base of a session's theme. The dashboard reads themes through its GraphQL
 * documents and types them from those (`Theme` in `@usertour/data`).
 */
export type RuntimeTheme = {
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
  BUBBLE = 'bubble',
  BANNER = 'banner',
  EMBED = 'embed',
  LAUNCHER_ICON = 'launcher-icon',
  LAUNCHER_BEACON = 'launcher-beacon',
  LAUNCHER_BUTTON = 'launcher-button',
  CHECKLIST = 'checklist',
  CHECKLIST_LAUNCHER = 'checklist-launcher',
  NPS = 'nps',
  RESOURCE_CENTER = 'resource-center',
  RESOURCE_CENTER_LAUNCHER = 'resource-center-launcher',
  ANNOUNCEMENT = 'announcement',
}

export type ThemeDetailSelectorType = {
  type: ThemeDetailPreviewType;
  name: string;
};
