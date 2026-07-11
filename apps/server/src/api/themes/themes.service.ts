import { Injectable } from '@nestjs/common';
import { toArray } from '../shared/query';
import { Prisma, type Theme as PrismaTheme } from '@prisma/client';
import { JsonValue } from '@prisma/client/runtime/library';
import { deepMergeThemeSettings, deriveThemeAutoColors } from '@usertour/helpers';
import { type ThemeTypesSetting } from '@usertour/types';
import { defaultSettings } from '@usertour/constants';
import { PrismaService } from 'nestjs-prisma';

import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';

import { ThemeNotFoundError, ValidationError } from '@/common/errors/errors';
import { ThemesService } from '@/themes/themes.service';

import {
  buildDecompileResolversFrom,
  loadDecompileResolvers,
} from '../content-representation/attribute-resolvers';
import { nameContains } from '@/common/filters';
import { paginate } from '../shared/pagination';
import { parseOrderBy } from '../shared/sort';
import { themeSettingsPatchSchema } from './settings.schema';
import { mapTheme } from './themes.mapper';
import {
  CreateThemeBody,
  GetThemeQuery,
  ListThemesQuery,
  Theme,
  ThemeExpand,
  UpdateThemeBody,
} from './themes.schema';

const FULL: ThemeExpand[] = ['settings', 'variations'];

/**
 * v2 themes handler. Reads the base theme always; `settings` / `variations` are
 * opt-in via expand. Settings pass through as-is; variation conditions go through
 * the shared rules codec (id <-> code). Depends on the domain {@link ThemesService}.
 */
@Injectable()
export class ApiThemesService {
  constructor(
    private readonly themes: ThemesService,
    private readonly prisma: PrismaService,
  ) {}

  async list(
    requestUrl: string,
    projectId: string,
    query: ListThemesQuery,
  ): Promise<{ results: Theme[]; next: string | null; previous: string | null }> {
    const { limit, cursor, name } = query;
    const expand = toArray(query.expand);
    // Resolvers are only consumed when decompiling variation conditions; skip the
    // two catalog queries on the common read path that doesn't expand variations.
    const resolvers = expand.includes('variations')
      ? await loadDecompileResolvers(this.prisma, projectId)
      : buildDecompileResolversFrom([], []);
    const orderBy = parseOrderBy(query.orderBy, [
      'createdAt',
    ]) as Prisma.ThemeOrderByWithRelationInput[];
    const nameFilter = nameContains(name);
    const where: Prisma.ThemeWhereInput = {
      projectId,
      deleted: false,
      ...(nameFilter ? { name: nameFilter } : {}),
    };

    return paginate({
      requestUrl,
      cursor,
      limit,
      fetch: (params) =>
        findManyCursorConnection<PrismaTheme, Prisma.ThemeWhereUniqueInput>(
          (args) => this.prisma.theme.findMany({ where, orderBy, ...args }),
          () => this.prisma.theme.count({ where }),
          params,
        ),
      map: (row) => mapTheme(row, expand, resolvers),
    });
  }

  async get(id: string, projectId: string, query: GetThemeQuery): Promise<Theme> {
    const expand = toArray(query.expand);
    const theme = await this.requireTheme(id, projectId);
    const resolvers = expand.includes('variations')
      ? await loadDecompileResolvers(this.prisma, projectId)
      : buildDecompileResolversFrom([], []);
    return mapTheme(theme, expand, resolvers);
  }

  /**
   * Validate a settings patch against the neutral constraint SSOT. Done here (not
   * only in the REST pipe) so the MCP path — which bypasses the controller — is
   * equally strict. Mirrors the content codec's `parse`.
   */
  private parseSettingsPatch(settings: unknown): Partial<ThemeTypesSetting> {
    const result = themeSettingsPatchSchema.safeParse(settings);
    if (!result.success) {
      const issue = result.error.issues[0];
      const message = issue
        ? issue.path.length
          ? `${issue.path.join('.')}: ${issue.message}`
          : issue.message
        : 'Invalid theme settings';
      throw new ValidationError(message);
    }
    return result.data as Partial<ThemeTypesSetting>;
  }

  /**
   * Create a theme. Starts from the fixed built-in `defaultSettings` (a neutral base — NOT a
   * copy of the project's default / isDefault theme); an optional `settings` patch is
   * field-merged onto it and auto colors derived. `variations` are not yet writable.
   */
  async create(projectId: string, body: CreateThemeBody): Promise<Theme> {
    const settings = body.settings
      ? deriveThemeAutoColors(
          deepMergeThemeSettings(defaultSettings, this.parseSettingsPatch(body.settings)),
        )
      : defaultSettings;
    const created = await this.themes.createTheme({
      projectId,
      name: body.name,
      isDefault: body.isDefault ?? false,
      settings: settings as unknown as JsonValue,
      variations: [] as unknown as JsonValue,
    });
    const resolvers = await loadDecompileResolvers(this.prisma, projectId);
    return mapTheme(created, FULL, resolvers);
  }

  /**
   * Update a theme's metadata and/or styling. A `settings` patch is field-merged onto
   * the theme's current settings and auto colors are re-derived. Rejects system themes.
   */
  async update(id: string, projectId: string, body: UpdateThemeBody): Promise<Theme> {
    const theme = await this.requireTheme(id, projectId);
    if (theme.isSystem) {
      throw new ValidationError('Cannot modify a system theme.');
    }
    // Ground the stored settings on the complete defaultSettings before patching —
    // the same fill the builder does on load (theme-builder.tsx: deepmerge(defaultSettings,
    // settings)) and create() does. A legacy theme whose stored JSON predates a nested
    // field (e.g. buttons.primary.border) would otherwise reach deriveThemeAutoColors
    // incomplete and 500 on its deep dereferences.
    const settingsUpdate =
      body.settings !== undefined
        ? {
            settings: deriveThemeAutoColors(
              deepMergeThemeSettings(
                deepMergeThemeSettings(
                  defaultSettings,
                  (theme.settings ?? {}) as Partial<ThemeTypesSetting>,
                ),
                this.parseSettingsPatch(body.settings),
              ),
            ) as unknown as JsonValue,
          }
        : {};
    // The domain updateTheme deliberately drops isDefault (the builder moves the
    // default via its dedicated setDefaultTheme action), so passing it through
    // would be a silent no-op. Route the flag to the same domain primitive here.
    // Unsetting is refused: a project must keep a default theme (create_content
    // falls back to it) — the way to change it is defaulting ANOTHER theme.
    if (body.isDefault === false && theme.isDefault) {
      throw new ValidationError(
        'Cannot unset the default theme — set another theme as the default instead.',
      );
    }
    const metadataUpdate = {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...settingsUpdate,
    };
    let updated =
      Object.keys(metadataUpdate).length > 0
        ? await this.themes.updateTheme({ id, ...metadataUpdate })
        : theme;
    if (body.isDefault === true && !theme.isDefault) {
      updated = await this.themes.setDefaultTheme(id);
    }
    const resolvers = await loadDecompileResolvers(this.prisma, projectId);
    return mapTheme(updated, FULL, resolvers);
  }

  /** Delete a theme. Rejects the default and system themes. */
  async delete(id: string, projectId: string): Promise<void> {
    const theme = await this.requireTheme(id, projectId);
    if (theme.isSystem || theme.isDefault) {
      throw new ValidationError('Cannot delete the default or a system theme.');
    }
    await this.themes.deleteTheme(id);
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
