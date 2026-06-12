import { Injectable } from '@nestjs/common';
import { Prisma, type Theme as PrismaTheme } from '@prisma/client';
import { JsonValue } from '@prisma/client/runtime/library';
import { defaultSettings } from '@usertour/types';
import { PrismaService } from 'nestjs-prisma';

import { findManyCursorConnection } from '@devoxa/prisma-relay-cursor-connection';

import { ThemeNotFoundError, ValidationError } from '@/common/errors/errors';
import { ThemesService } from '@/themes/themes.service';

import { type DecompileResolvers } from '../content-representation/rules.decompile';
import { paginate } from '../shared/pagination';
import { parseOrderBy } from '../shared/sort';
import { mapTheme } from './themes.mapper';
import {
  CreateThemeBody,
  GetThemeQuery,
  ListThemesQuery,
  Theme,
  ThemeExpand,
  UpdateThemeBody,
} from './themes.schema';

function toArray(value: ThemeExpand | ThemeExpand[] | undefined): ThemeExpand[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

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
    const { limit, cursor } = query;
    const expand = toArray(query.expand);
    const resolvers = await this.buildDecompileResolvers(projectId);
    const orderByInput = Array.isArray(query.orderBy)
      ? query.orderBy
      : query.orderBy
        ? [query.orderBy]
        : ['createdAt'];
    const orderBy = parseOrderBy(orderByInput) as Prisma.ThemeOrderByWithRelationInput[];
    const where: Prisma.ThemeWhereInput = { projectId, deleted: false };

    return paginate({
      requestUrl,
      cursor,
      limit,
      query: { ...(expand.length ? { expand } : {}) },
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
    const resolvers = await this.buildDecompileResolvers(projectId);
    return mapTheme(theme, expand, resolvers);
  }

  /**
   * Create a theme. `settings` / `variations` are not writable through the API
   * (see themes.schema) — the theme is seeded with the default settings, which the
   * caller can then tune in the theme builder.
   */
  async create(projectId: string, body: CreateThemeBody): Promise<Theme> {
    const created = await this.themes.createTheme({
      projectId,
      name: body.name,
      isDefault: body.isDefault ?? false,
      settings: defaultSettings as unknown as JsonValue,
      variations: [] as unknown as JsonValue,
    });
    const resolvers = await this.buildDecompileResolvers(projectId);
    return mapTheme(created, FULL, resolvers);
  }

  /** Update a theme's metadata (name / isDefault). Rejects system themes. */
  async update(id: string, projectId: string, body: UpdateThemeBody): Promise<Theme> {
    const theme = await this.requireTheme(id, projectId);
    if (theme.isSystem) {
      throw new ValidationError('Cannot modify a system theme.');
    }
    const updated = await this.themes.updateTheme({
      id,
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.isDefault !== undefined ? { isDefault: body.isDefault } : {}),
    });
    const resolvers = await this.buildDecompileResolvers(projectId);
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

  /** Internal attribute / event ids -> stable codeName (read; fallback: the id). */
  private async buildDecompileResolvers(projectId: string): Promise<DecompileResolvers> {
    const [attributes, events] = await Promise.all([
      this.prisma.attribute.findMany({
        where: { projectId },
        select: { id: true, codeName: true },
      }),
      this.prisma.event.findMany({ where: { projectId }, select: { id: true, codeName: true } }),
    ]);
    const attrMap = new Map(attributes.map((a) => [a.id, a.codeName]));
    const eventMap = new Map(events.map((e) => [e.id, e.codeName]));
    return {
      attributeCode: (id) => attrMap.get(id) ?? id,
      eventCode: (id) => eventMap.get(id) ?? id,
    };
  }
}
