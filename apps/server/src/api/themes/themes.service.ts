import { Injectable } from '@nestjs/common';

import { ThemeNotFoundError } from '@/common/errors/errors';
import { ThemesService } from '@/themes/themes.service';

import { mapTheme } from './themes.mapper';
import { Theme } from './themes.schema';

/**
 * v2 themes handler. Read-only — exists so a client can discover the theme ids
 * accepted by the version `themeId` write. Depends on the domain
 * {@link ThemesService}; filters soft-deleted themes (the domain list does not).
 */
@Injectable()
export class ApiThemesService {
  constructor(private readonly themes: ThemesService) {}

  async list(projectId: string): Promise<{ results: Theme[]; next: null; previous: null }> {
    const rows = await this.themes.listThemesByProjectId(projectId);
    const results = rows
      .filter((t) => !(t as { deleted?: boolean }).deleted)
      .map((t) => mapTheme(t));
    return { results, next: null, previous: null };
  }

  async get(id: string, projectId: string): Promise<Theme> {
    return mapTheme(await this.requireTheme(id, projectId));
  }

  /** Load a live theme that belongs to the project, or throw E1021. Shared with the version themeId write. */
  async requireTheme(id: string, projectId: string) {
    const theme = await this.themes.getTheme(id);
    if (!theme || theme.projectId !== projectId || (theme as { deleted?: boolean }).deleted) {
      throw new ThemeNotFoundError();
    }
    return theme;
  }
}
