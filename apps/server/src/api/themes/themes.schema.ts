import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

import { ApiObjectType } from '../shared/object-type';

/**
 * v2 themes endpoint — a thin read-only projection so a client can discover the
 * theme ids that the version `themeId` write accepts. Themes are a small, bounded
 * per-project set, so the list is returned whole (no cursor pagination).
 */
export const theme = z.object({
  id: z.string(),
  object: z.literal(ApiObjectType.THEME),
  name: z.string(),
  isDefault: z.boolean(),
  updatedAt: z.string(),
  createdAt: z.string(),
});
export class ThemeDto extends createZodDto(theme) {}

export const listThemesResponse = z.object({
  results: z.array(theme),
  next: z.string().nullable(),
  previous: z.string().nullable(),
});
export class ListThemesResponseDto extends createZodDto(listThemesResponse) {}

export type Theme = z.infer<typeof theme>;
