import { Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import type { NewTheme } from '../types/new-theme.type';
import type { ThemeChanges } from '../types/theme-changes.type';
import type { ThemeCopy } from '../types/theme-copy.type';
import { ParamsError } from '@/modules/common/errors/errors';
import { ProjectCacheService } from '@/modules/common/services/project-cache.service';
import { ReferencesService } from '@/modules/references/services/references.service';
import { deletedDependencyRestoreError } from '@/modules/references/utils/deleted-dependency-error.util';

@Injectable()
export class ThemesService {
  constructor(
    private prisma: PrismaService,
    private readonly cache: ProjectCacheService,
    private readonly references: ReferencesService,
  ) {}

  async createTheme(data: NewTheme) {
    if (data.isDefault) {
      await this.unsetThemeDefault(data.projectId);
    }
    const created = await this.prisma.theme.create({
      data,
    });
    await this.cache.invalidate(this.cache.keys.themes(created.projectId));
    return created;
  }

  async unsetThemeDefault(projectId: string) {
    const result = await this.prisma.theme.updateMany({
      where: { isDefault: true, projectId },
      data: { isDefault: false },
    });
    await this.cache.invalidate(this.cache.keys.themes(projectId));
    return result;
  }

  async setDefaultTheme(themeId: string) {
    // New content takes the default theme, so a deleted one must never become it.
    const theme = await this.prisma.theme.findFirst({ where: { id: themeId, deleted: false } });
    if (!theme) {
      throw new ParamsError();
    }
    await this.unsetThemeDefault(theme.projectId);
    const updated = await this.prisma.theme.update({
      where: { id: themeId },
      data: { isDefault: true },
    });
    await this.cache.invalidate(this.cache.keys.themes(updated.projectId));
    return updated;
  }

  async updateTheme(data: ThemeChanges) {
    const { id, isDefault, ...others } = data;
    const theme = await this.prisma.theme.findFirst({ where: { id: data.id } });
    if (!theme || theme.isSystem) {
      throw new ParamsError();
    }
    const updated = await this.prisma.theme.update({
      where: { id },
      data: { ...others },
    });
    await this.cache.invalidate(this.cache.keys.themes(updated.projectId));
    return updated;
  }

  async getTheme(id: string) {
    return await this.prisma.theme.findUnique({
      where: { id },
    });
  }

  /**
   * Soft delete (ADR 0016): the row stays so historical versions keep their
   * theme and restoring one reproduces it. Refused while a live surface uses
   * the theme — the scan covers version-level themeId and per-step overrides
   * of every live content's draft and published versions; history never blocks.
   */
  async deleteTheme(id: string) {
    const theme = await this.prisma.theme.findFirst({ where: { id, deleted: false } });
    if (!theme || theme.isSystem || theme.isDefault) {
      throw new ParamsError();
    }
    await this.references.assertUnreferenced(theme.projectId, 'theme', id);
    const deleted = await this.prisma.theme.update({
      where: { id },
      data: { deleted: true },
    });
    await this.cache.invalidate(this.cache.keys.themes(deleted.projectId));
    return deleted;
  }

  /**
   * Bring a soft-deleted theme back as it was. Idempotent on a live theme.
   * Refused while its variations use deleted definitions (ADR 0016 §5).
   */
  async restoreTheme(id: string) {
    const theme = await this.prisma.theme.findFirst({ where: { id } });
    if (!theme) {
      throw new ParamsError();
    }
    if (!theme.deleted) {
      return theme;
    }
    const dependencies = await this.references.findDeletedConditionReferences(
      theme.projectId,
      theme.variations,
    );
    if (dependencies.length > 0) {
      throw deletedDependencyRestoreError('theme', dependencies);
    }
    const restored = await this.prisma.theme.update({
      where: { id },
      data: { deleted: false },
    });
    await this.cache.invalidate(this.cache.keys.themes(restored.projectId));
    return restored;
  }

  async copyTheme(input: ThemeCopy) {
    const { settings, projectId, variations } = await this.prisma.theme.findUnique({
      where: { id: input.id },
    });
    const data: NewTheme = {
      settings,
      projectId,
      isDefault: false,
      name: input.name,
      variations,
    };
    return await this.createTheme(data);
  }

  async listThemesByProjectId(projectId: string) {
    return await this.prisma.theme.findMany({
      where: { projectId, deleted: false },
      orderBy: { id: 'asc' },
    });
  }
}
