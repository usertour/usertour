import type { JsonValue } from '@prisma/client/runtime/library';

/** A theme to add to a project — what ThemesService.createTheme takes. */
export type NewTheme = {
  name: string;
  isDefault: boolean;
  projectId: string;
  settings: JsonValue;
  variations?: JsonValue;
};
