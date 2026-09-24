import type { JsonValue } from '@prisma/client/runtime/library';

/** The fields of a theme to change — what ThemesService.updateTheme takes. */
export type ThemeChanges = {
  id: string;
  name?: string;
  isDefault?: boolean;
  settings?: JsonValue;
  variations?: JsonValue;
};
