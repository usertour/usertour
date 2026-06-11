import { Injectable } from '@nestjs/common';
import { JsonValue } from '@prisma/client/runtime/library';
import { cuid } from '@usertour/helpers';
import { PrismaService } from 'nestjs-prisma';

import { ThemeNotFoundError, ValidationError } from '@/common/errors/errors';
import { ThemesService } from '@/themes/themes.service';

import { type CompileResolvers, compileConditions } from '../content-representation/rules.compile';
import { type DecompileResolvers } from '../content-representation/rules.decompile';
import { mapTheme } from './themes.mapper';
import {
  CreateThemeBody,
  GetThemeQuery,
  ListThemesQuery,
  Theme,
  ThemeExpand,
  ThemeVariationInput,
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
    projectId: string,
    query: ListThemesQuery,
  ): Promise<{ results: Theme[]; next: null; previous: null }> {
    const expand = toArray(query.expand);
    const resolvers = await this.buildDecompileResolvers(projectId);
    const rows = await this.themes.listThemesByProjectId(projectId);
    const results = rows
      .filter((t) => !(t as { deleted?: boolean }).deleted)
      .map((t) => mapTheme(t, expand, resolvers));
    return { results, next: null, previous: null };
  }

  async get(id: string, projectId: string, query: GetThemeQuery): Promise<Theme> {
    const expand = toArray(query.expand);
    const theme = await this.requireTheme(id, projectId);
    const resolvers = await this.buildDecompileResolvers(projectId);
    return mapTheme(theme, expand, resolvers);
  }

  /** Create a theme. Settings pass through; variation conditions are compiled. */
  async create(projectId: string, body: CreateThemeBody): Promise<Theme> {
    const compileResolvers = await this.buildCompileResolvers(projectId);
    const created = await this.themes.createTheme({
      projectId,
      name: body.name,
      isDefault: body.isDefault ?? false,
      settings: body.settings as unknown as JsonValue,
      variations: this.compileVariations(body.variations, compileResolvers),
    });
    const resolvers = await this.buildDecompileResolvers(projectId);
    return mapTheme(created, FULL, resolvers);
  }

  /** Update a theme (partial — only provided fields are written). Rejects system themes. */
  async update(id: string, projectId: string, body: UpdateThemeBody): Promise<Theme> {
    const theme = await this.requireTheme(id, projectId);
    if (theme.isSystem) {
      throw new ValidationError('Cannot modify a system theme.');
    }
    const compileResolvers = await this.buildCompileResolvers(projectId);
    const updated = await this.themes.updateTheme({
      id,
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.isDefault !== undefined ? { isDefault: body.isDefault } : {}),
      ...(body.settings !== undefined ? { settings: body.settings as unknown as JsonValue } : {}),
      ...(body.variations !== undefined
        ? { variations: this.compileVariations(body.variations, compileResolvers) }
        : {}),
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

  /** Compile public variations into the internal shape (conditions code -> id). */
  private compileVariations(
    variations: ThemeVariationInput[] | undefined,
    resolvers: CompileResolvers,
  ): JsonValue {
    return (variations ?? []).map((v) => ({
      id: v.id ?? cuid(),
      name: v.name,
      conditions: compileConditions(v.conditions, resolvers),
      settings: v.settings,
    })) as unknown as JsonValue;
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

  /** Stable codeName -> internal attribute / event id (write; fallback: the code). */
  private async buildCompileResolvers(projectId: string): Promise<CompileResolvers> {
    const [attributes, events] = await Promise.all([
      this.prisma.attribute.findMany({
        where: { projectId },
        select: { id: true, codeName: true },
      }),
      this.prisma.event.findMany({ where: { projectId }, select: { id: true, codeName: true } }),
    ]);
    const attrMap = new Map(attributes.map((a) => [a.codeName, a.id]));
    const eventMap = new Map(events.map((e) => [e.codeName, e.id]));
    return {
      attributeId: (code) => attrMap.get(code) ?? code,
      eventId: (code) => eventMap.get(code) ?? code,
    };
  }
}
