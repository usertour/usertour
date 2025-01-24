import { ThemeTypesSetting } from "./theme-settings";

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
